import { EventHandler } from 'modloader64_api/EventHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import * as Main from '../Main';
import * as API from 'BanjoKazooie/API/Imports';
import * as Net from '../network/Imports';

export class BkOnline_Handlers {
    private parent!: Main.BkOnline;

    // Helpers
    private eventsL = 0;
    private eventsS = 0;

    get core(): API.IBKCore { return this.parent.core; }
    get modloader(): IModLoaderAPI { return this.parent.ModLoader; }

    constructor(parent: Main.BkOnline) { this.parent = parent; }

    init() { }

    tick() {
        let isPlaying = this.core.isPlaying();
        let isCutscene = this.core.runtime.is_cutscene();
        if (!isPlaying || isCutscene) {
            if (!isPlaying) {
                // Intro Cutscene skip
                let save: Buffer = Buffer.alloc(1);
                save[0] = 0x11;
                this.core.save.set_save(API.ProfileType.TITLE, save);
            }

            return;
        }

        // Initializers
        let bufStorage: Buffer;
        let bufData: Buffer;
        let transitState = this.core.runtime.get_transition_state();
        let scene: API.SceneType = this.core.runtime.current_scene;
        let inTransit: boolean = !(transitState === 0 || transitState === 4);
        let isLoading: boolean = this.core.runtime.is_loading();
        let forceReload: boolean = false;

        // Refresh Map State
        if (this.parent.cDB.reloadMap) {
            // Reset state
            this.parent.cDB.reloadMap = false;

            // Invoke puppet reload
            forceReload = true;
        }

        // General Setup/Handlers
        this.read_events();
        this.handle_puppets(scene, isLoading, inTransit, forceReload);

        // Progress Flags Handlers
        this.handle_flags_game(bufData!, bufStorage!);
        this.handle_flags_honeycomb(bufData!, bufStorage!);
        this.handle_flags_jiggy(bufData!, bufStorage!);
        this.handle_flags_token(bufData!, bufStorage!);

        // Non-Flags Handlers
        this.handle_moves();
        this.handle_events_level();
        this.handle_events_scene();
        this.handle_items();

        // Order-Specific Handlers
        this.handle_permanence_counts();
        this.handle_note_totals(bufData!, bufStorage!);

        // Force Despawn Code
        if (transitState !== 0) return;
        this.handle_despawn_actors();
        this.handle_despawn_voxels();
    }

    // #################################################
    // ##  Utility Functions
    // #################################################

    log(input: string) {
        if (this.parent.config.print_net_server)
            this.modloader.logger.info('[Tick] ' + input);
    }

    // #################################################
    // ##  API Events
    // #################################################

    @EventHandler(API.BkEvents.ON_SCENE_CHANGE)
    onSceneChange(scene: number, level: number) {
        // Set global to current scene value
        this.parent.cDB.curScn = scene;

        // Alert scene change so puppet can despawn for other players
        if (scene === API.SceneType.UNKNOWN) {
            this.modloader.clientSide.sendPacket(new Net.SyncLocation(this.modloader.clientLobby, 0, 0));
            return;
        }

        // Handle level change stuff
        if (level !== this.parent.cDB.curLvl) {
            this.parent.cDB.curLvl = level;

            // Reset object note count
            this.parent.cDB.oNoteCount = 0;
        }

        // Ensure we have this level/scene data!
        this.check_db_instance(this.parent.cDB, level, scene);

        // Alert scene change!
        this.modloader.clientSide.sendPacket(new Net.SyncLocation(this.modloader.clientLobby, level, scene));
        this.log('Moved to scene[' + API.SceneType[scene] + '].');

        // Remove completed jinjos from previous session!
        if (this.parent.cDB.levelData[level].jinjos !== 0x1f) {
            switch (level) {
                case API.LevelType.MUMBOS_MOUNTAIN:
                    if ((this.parent.cDB.flagsJiggy[0] & (1 << 1)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;

                case API.LevelType.TREASURE_TROVE_COVE:
                    if ((this.parent.cDB.flagsJiggy[1] & (1 << 3)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;

                case API.LevelType.CLANKERS_CAVERN:
                    if ((this.parent.cDB.flagsJiggy[2] & (1 << 5)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;

                case API.LevelType.BUBBLE_GLOOP_SWAMP:
                    if ((this.parent.cDB.flagsJiggy[3] & (1 << 7)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;

                case API.LevelType.FREEZEEZY_PEAK:
                    if ((this.parent.cDB.flagsJiggy[5] & (1 << 1)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;

                case API.LevelType.GOBEYS_VALEY:
                    if ((this.parent.cDB.flagsJiggy[7] & (1 << 5)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;

                case API.LevelType.CLICK_CLOCK_WOODS:
                    if ((this.parent.cDB.flagsJiggy[8] & (1 << 7)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;

                case API.LevelType.RUSTY_BUCKET_BAY:
                    if ((this.parent.cDB.flagsJiggy[10] & (1 << 1)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;

                case API.LevelType.MAD_MONSTER_MANSION:
                    if ((this.parent.cDB.flagsJiggy[11] & (1 << 3)) !== 0)
                        this.parent.cDB.levelData[level].jinjos = 0x1f;
                    break;
            }
        }

        // Make sure to delete already collected stuff!
        this.parent.cDB.delActors = true;
        this.parent.cDB.delVoxels = true;

        // temp values
        this.eventsL = 0;
        this.eventsS = 0;
    }

    @EventHandler(API.BkEvents.ON_COLLIDE_ACTOR)
    onCollideActor(actors: Array<number>) {
        let pData: Net.SyncLevelNumbered;
        let level = this.parent.cDB.curLvl;
        let foundJinjo = false;
        let foundNotes = false;

        actors.forEach((id: number)=>{
            switch (id) {
                case 0x06d6: // Notes
                    this.parent.cDB.oNoteCount += 1;
                    if (this.parent.cDB.levelData[level].onotes < this.parent.cDB.oNoteCount) {
                        this.parent.cDB.levelData[level].onotes = this.parent.cDB.oNoteCount;
                        foundNotes = true;
                    }
                    break;

                case 0x03C0: // Blue Jinjo
                    this.parent.cDB.levelData[level].jinjos |= 1 << 0;
                    foundJinjo = true;
                    break;

                case 0x03C2: // Green Jinjo
                    this.parent.cDB.levelData[level].jinjos |= 1 << 1;
                    foundJinjo = true;
                    break;

                case 0x03BC: // Orange Jinjo
                    this.parent.cDB.levelData[level].jinjos |= 1 << 2;
                    foundJinjo = true;
                    break;

                case 0x03C1: // Pink Jinjo
                    this.parent.cDB.levelData[level].jinjos |= 1 << 3;
                    foundJinjo = true;
                    break;

                case 0x03BB: // Yellow Jinjo
                    this.parent.cDB.levelData[level].jinjos |= 1 << 4;
                    foundJinjo = true;
                    break;
            }
        });

        if (foundJinjo) {
            pData = new Net.SyncLevelNumbered(
                this.modloader.clientLobby,
                'SyncJinjos',
                level,
                this.parent.cDB.levelData[level].jinjos,
                false
            );
            this.modloader.clientSide.sendPacket(pData);
        }

        if (foundNotes) {
            pData = new Net.SyncLevelNumbered(
                this.modloader.clientLobby,
                'SyncObjectNotes',
                level,
                this.parent.cDB.levelData[level].onotes,
                false
            );
            this.modloader.clientSide.sendPacket(pData);
        }
    }

    @EventHandler(API.BkEvents.ON_COLLIDE_VOXEL)
    onCollideVoxel(voxels: Array<number>) {
        let level = this.parent.cDB.curLvl;
        let scene = this.parent.cDB.curScn;
        let name = '';
        let foundNotes = false;

        voxels.forEach((ptr: number)=>{
            switch (this.modloader.emulator.rdramRead16(ptr)) {
                case 0x1640: // Notes
                    name += "x[" + this.modloader.emulator.rdramRead16(ptr + 0x04) +
                            "]y[" + this.modloader.emulator.rdramRead16(ptr + 0x06) +
                            "]z[" + this.modloader.emulator.rdramRead16(ptr + 0x08) + "]";

                    if (!this.parent.cDB.levelData[level].scene[scene].notes.includes(name)) {
                        this.parent.cDB.levelData[level].scene[scene].notes.push(name);
                        foundNotes = true;
                    }
                    break;
                }
        });

        if (foundNotes) {
            let pData = new Net.SyncVoxelNotes(
                this.modloader.clientLobby,
                level,
                scene,
                this.parent.cDB.levelData[level].scene[scene].notes,
                false
            );

            this.modloader.clientSide.sendPacket(pData);
        }
    }

    // #################################################
    // ##  Handler Functions
    // #################################################

    read_events() {
        let evt: number;
        let i: number;
        let isSet: boolean;

        if (this.parent.config.print_events_level) {
            evt = this.core.runtime.current_level_events;
            if (evt !== this.eventsL) {
                for (i = 0; i < 32; i++) {
                    isSet = (evt & (1 << i)) !== 0;
                    if (((this.eventsL & (1 << i)) !== 0) !== isSet) {
                        if (isSet) {
                            this.log('Level-Bit Set:' + i);
                        } else {
                            this.log('Level-Bit Unset:' + i);
                        }
                    }
                }

                this.eventsL = evt;
            }
        }

        if (this.parent.config.print_events_scene) {
            evt = this.core.runtime.current_scene_events;
            if (evt !== this.eventsS) {
                for (i = 0; i < 32; i++) {
                    isSet = (evt & (1 << i)) !== 0;
                    if (((this.eventsS & (1 << i)) !== 0) !== isSet) {
                        if (isSet) {
                            this.log('Scene-Bit Set:' + i);
                        } else {
                            this.log('Scene-Bit Unset:' + i);
                        }
                    }
                }

                this.eventsS = evt;
            }
        }
    }

    merge_bits(buf1: Buffer, buf2: Buffer): boolean {
        let c1 = buf1.byteLength;
        let c2 = buf2.byteLength;
        let count = c1 > c2 ? c2 : c1;

        let i: number;
        let needUpdate = false;

        for (i = 0; i < count; i++) {
            if (buf1[i] === buf2[i]) continue;
            buf1[i] |= buf2[i];
            needUpdate = true;
        }

        return needUpdate;
    }

    count_flags(buf: Buffer, offset: number, count: number): number {
        let result = 0;
        let byteOff: number;
        let bitOff: number;
        let tOffset: number;

        for (let i = 0; i < count; i++) {
            tOffset = offset + i;
            byteOff = Math.floor(tOffset / 8);
            bitOff = tOffset % 8;

            if (buf[byteOff] & (1 << bitOff)) {
                result |= 1 << i;
            }
        }

        return result;
    }

    get_flag(buf: Buffer, offset: number): boolean {
        let byte = Math.floor(offset / 8);
        let bit = offset % 8;

        return (buf[byte] & (1 << bit)) !== 0;
    }

    set_flags(buf: Buffer, offset: number, count: number, val: number) {
        let byteOff: number;
        let bitOff: number;
        let tOffset: number;

        for (let i = 0; i < count; i++) {
            tOffset = offset + i;
            byteOff = Math.floor(tOffset / 8);
            bitOff = tOffset % 8;

            if ((buf[byteOff] & (1 << bitOff)) !== (val & (1 << i))) {
                buf[byteOff] ^= 1 << bitOff;
            }
        }
    }

    check_db_instance(db: Net.Database, level: number, scene: number) {
        if (level === 0) return;

        // Spawn missing level variable!
        if (!db.levelData.hasOwnProperty(level)) {
            db.levelData[level] = new Net.LevelData();
        }

        if (scene === 0) return;

        // Spawn missing scene variable!
        if (!db.levelData[level].scene.hasOwnProperty(scene)) {
            db.levelData[level].scene[scene] = new Net.SceneData();
        }
    }

    handle_puppets(scene: API.SceneType, isLoading: boolean, inTransit: boolean, forceReload: boolean) {
        if (isLoading || forceReload) {
            this.parent.pMgr.scene = API.SceneType.UNKNOWN;
        } else {
            this.parent.pMgr.scene = scene;
        }

        this.parent.pMgr.onTick(
            !inTransit && !isLoading && this.parent.cDB.curScn !== API.SceneType.UNKNOWN
        );
    }

    handle_puzzle_count(bufData: Buffer, bufStorage: Buffer) {
        // Initializers
        let pData: Net.SyncBuffered;
        let i: number;
        let needUpdate = false;

        // Count puzzles currently slotted
        bufStorage = this.parent.cDB.jigsawsCompleted;
        let count_mm: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_MM_0,
            1
        );
        let count_ttc: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_TTC_0,
            2
        );
        let count_cc: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_CC_0,
            3
        );
        let count_bgs: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_BGS_0,
            3
        );
        let count_fp: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_FP_0,
            4
        );
        let count_gv: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_GV_0,
            4
        );
        let count_mmm: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_MMM_0,
            4
        );
        let count_rbb: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_RBB_0,
            4
        );
        let count_ccw: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_CCW_0,
            4
        );
        let count_dog: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_DOG_0,
            5
        );
        let count_dh: number = this.count_flags(
            bufData,
            API.GameBMP.PIECES_IN_PUZZLE_DH_0,
            3
        );
        needUpdate = false;

        // Handle new completed puzzles
        {
            // Mumbos Mountain
            if (count_mm === 1 && bufStorage[0] !== 1) {
                bufStorage[0] = 1;
                needUpdate = true;
            } else if (count_mm !== 1 && bufStorage[0] === 1) {
                count_mm = 1;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_MM_0, 1, 1);
                needUpdate = true;
            }

            // Treasure Trove Cove
            if (count_ttc === 2 && bufStorage[1] !== 1) {
                bufStorage[1] = 1;
                needUpdate = true;
            } else if (count_ttc !== 2 && bufStorage[1] === 1) {
                count_ttc = 2;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_TTC_0, 2, 2);
                needUpdate = true;
            }

            // Clankers Cavern
            if (count_cc === 5 && bufStorage[2] !== 1) {
                bufStorage[2] = 1;
                needUpdate = true;
            } else if (count_cc !== 5 && bufStorage[2] === 1) {
                count_cc = 5;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_CC_0, 3, 5);
                needUpdate = true;
            }

            // BubbleGloop Swamp
            if (count_bgs === 7 && bufStorage[3] !== 1) {
                bufStorage[3] = 1;
                needUpdate = true;
            } else if (count_bgs !== 7 && bufStorage[3] === 1) {
                count_bgs = 7;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_BGS_0, 3, 7);
                needUpdate = true;
            }

            // Freezeezy Peaks
            if (count_fp === 8 && bufStorage[4] !== 1) {
                bufStorage[4] = 1;
                needUpdate = true;
            } else if (count_fp !== 8 && bufStorage[4] === 1) {
                count_fp = 8;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_FP_0, 4, 8);
                needUpdate = true;
            }

            // Gobeys Valley
            if (count_gv === 9 && bufStorage[5] !== 1) {
                bufStorage[5] = 1;
                needUpdate = true;
            } else if (count_gv !== 9 && bufStorage[5] === 1) {
                count_gv = 9;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_GV_0, 4, 9);
                needUpdate = true;
            }

            // Mad Monster Mansion
            if (count_mmm === 10 && bufStorage[6] !== 1) {
                bufStorage[6] = 1;
                needUpdate = true;
            } else if (count_mmm !== 10 && bufStorage[6] === 1) {
                count_mmm = 10;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_MMM_0, 4, 10);
                needUpdate = true;
            }

            // Rusty Bucket Bay
            if (count_rbb === 12 && bufStorage[7] !== 1) {
                bufStorage[7] = 1;
                needUpdate = true;
            } else if (count_rbb !== 12 && bufStorage[7] === 1) {
                count_rbb = 12;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_RBB_0, 4, 12);
                needUpdate = true;
            }

            // Click Clock Woods
            if (count_ccw === 15 && bufStorage[8] !== 1) {
                bufStorage[8] = 1;
                needUpdate = true;
            } else if (count_ccw !== 15 && bufStorage[8] === 1) {
                count_ccw = 15;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_CCW_0, 4, 15);
                needUpdate = true;
            }

            // Door Of Gruntilda
            if (count_dog === 25 && bufStorage[9] !== 1) {
                bufStorage[9] = 1;
                needUpdate = true;
            } else if (count_dog !== 25 && bufStorage[9] === 1) {
                count_dog = 25;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_DOG_0, 5, 25);
                needUpdate = true;
            }

            // Defense HoneyComb
            if (count_dh === 4 && bufStorage[10] !== 1) {
                bufStorage[10] = 1;
                needUpdate = true;
            } else if (count_dh !== 4 && bufStorage[10] === 1) {
                count_dh = 4;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_DH_0, 3, 4);
                needUpdate = true;
            }
        }

        if (needUpdate) {
            if (count_mm !== 1) {
                count_mm = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_MM_0, 1, 0);
            }
            if (count_ttc !== 2) {
                count_ttc = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_TTC_0, 2, 0);
            }
            if (count_cc !== 5) {
                count_cc = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_CC_0, 3, 0);
            }
            if (count_bgs !== 7) {
                count_bgs = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_BGS_0, 3, 0);
            }
            if (count_fp !== 8) {
                count_fp = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_FP_0, 4, 0);
            }
            if (count_gv !== 9) {
                count_gv = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_GV_0, 4, 0);
            }
            if (count_mmm !== 10) {
                count_mmm = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_MMM_0, 4, 0);
            }
            if (count_rbb !== 12) {
                count_rbb = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_RBB_0, 4, 0);
            }
            if (count_ccw !== 15) {
                count_ccw = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_CCW_0, 4, 0);
            }
            if (count_dog !== 25) {
                count_dog = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_DOG_0, 5, 0);
            }
            if (count_dh !== 4) {
                count_dh = 0;
                this.set_flags(bufData, API.GameBMP.PIECES_IN_PUZZLE_DH_0, 3, 0);
            }

            // Set flags back
            for (i = 11; i < 18; i++) {
                this.core.save.flags_game.set(i, bufData[i]);
            }

            this.parent.cDB.jigsawsCompleted = bufStorage;
            pData = new Net.SyncBuffered(this.modloader.clientLobby, 'SyncJigsaws', bufStorage, false);
            this.modloader.clientSide.sendPacket(pData);
        }

        this.parent.cDB.jiggySpent =
            count_mm +
            count_ttc +
            count_cc +
            count_bgs +
            count_fp +
            count_gv +
            count_mmm +
            count_rbb +
            count_ccw +
            count_dog +
            count_dh;
    }

    handle_tokens_paid_count(bufData: Buffer) {
        // Initializers
        let id: number;
        let count = 0;

        // Mumbos Mountain
        id = API.GameBMP.TOKENS_PAID_MM;
        if (bufData[Math.floor(id / 8)] & (1 << (id % 8))) count += 5;

        // Mad Monster Mansion
        id = API.GameBMP.TOKENS_PAID_MMM;
        if (bufData[Math.floor(id / 8)] & (1 << (id % 8))) count += 20;

        // Freezeezy Peak
        id = API.GameBMP.TOKENS_PAID_FP;
        if (bufData[Math.floor(id / 8)] & (1 << (id % 8))) count += 15;

        // BubbleGloop Swamp
        id = API.GameBMP.TOKENS_PAID_BGS;
        if (bufData[Math.floor(id / 8)] & (1 << (id % 8))) count += 10;

        // Click Clock Woods
        id = API.GameBMP.TOKENS_PAID_CCW;
        if (bufData[Math.floor(id / 8)] & (1 << (id % 8))) count += 25;

        this.parent.cDB.tokensSpent = count;
    }

    handle_flags_game(bufData: Buffer, bufStorage: Buffer) {
        // Initializers
        let pData: Net.SyncBuffered;
        let i: number;
        let count: number;
        let val: number;
        let needUpdate = false;
        let needRefresh = false;

        bufData = this.core.save.flags_game.get_all();
        bufStorage = this.parent.cDB.flagsGame;
        count = bufData.byteLength;
        needUpdate = false;

        // Map refresh check
        needRefresh = this.handle_refresh_check(bufData, bufStorage);

        for (i = 0; i < count; i++) {
            if (i === 4) continue; // RBB water level
            if (i > 10 && i < 17) continue; // Puzzle gap
            if (bufData[i] === bufStorage[i]) continue;

            bufData[i] |= bufStorage[i];
            this.core.save.flags_game.set(i, bufData[i]);
            needUpdate = true;
        }

        // RBB water level
        val = bufStorage[4] & 0x0000003f;
        if ((bufData[4] & 0x0000003f) !== val) {
            bufData[4] |= val;
            this.core.save.flags_game.set(4, bufData[4]);
            needUpdate = true;
        }

        // Puzzle gap start
        val = bufStorage[11] & 0x0000001f;
        if ((bufData[11] & 0x0000001f) !== val) {
            bufData[11] |= val;
            this.core.save.flags_game.set(11, bufData[11]);
            needUpdate = true;
        }

        // Puzzle gap end
        val = bufStorage[16] & 0x000000fc;
        if ((bufData[16] & 0x000000fc) !== val) {
            bufData[16] |= val;
            this.core.save.flags_game.set(16, bufData[16]);
            needUpdate = true;
        }

        // Send Changes to Server
        if (needUpdate) {
            this.parent.cDB.flagsGame = bufData;
            pData = new Net.SyncBuffered(this.modloader.clientLobby, 'SyncGameFlags', bufData, false);
            this.modloader.clientSide.sendPacket(pData);
        }

        // Sub Flag Counters
        {
            this.handle_puzzle_count(bufData, bufStorage);
            this.handle_tokens_paid_count(bufData);
        }

        if (needRefresh) {
            // Temporary handler til we can despawn objects
            this.parent.cDB.reloadMap = true;

            // Perform warp
            this.core.runtime.goto_scene(this.parent.cDB.curScn, this.core.runtime.current_exit);
        }
    }

    handle_refresh_check(bufData: Buffer, bufStorage: Buffer): boolean {
        let needRefresh = false;

        switch (this.parent.cDB.curLvl) {
            case API.LevelType.GRUNTILDAS_LAIR:

                // Entrance Room / Mumbos Mountain Lobby
                if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_MM) {
                    // Mumbos Mountain Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_MM) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_MM)) { needRefresh = true; break; }

                    // 50 Note Door
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_50) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_50)) { needRefresh = true; break; }
                }

                // Pipe Room / 180 Note Door Hill
                else if (this.parent.cDB.curScn === API.SceneType.GL_NOTE_DOOR_180) {
                    // 180 Note Door
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_180) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_180)) { needRefresh = true; break; }
                }

                // Treasure Trove Cove Lobby
                else if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_TTC) {
                    // Treasure Trove Cove Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_TTC) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_TTC)) { needRefresh = true; break; }
                }

                // Clankers Cavern Lobby
                else if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_CC) {
                    // Clankers Cavern Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_CC) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_CC)) { needRefresh = true; break; }
                }

                // Witch Statue / 260 Note Door
                else if (this.parent.cDB.curScn === API.SceneType.GL_WITCH_STATUE) {
                    // 260 Note Door
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_260) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_260)) { needRefresh = true; break; }
                }

                // Bubble Gloop Swamp Lobby
                else if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_BGS) {
                    // Bubble Gloop Swamp Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_BGS) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_BGS)) { needRefresh = true; break; }
                }

                // Gobey's Valley Lobby
                else if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_GV) {
                    // Gobey's Valley Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_GV) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_GV)) { needRefresh = true; break; }
                }

                // Witch Head 350 Note Door / Freezeezy Peeks Lobby / 450 Note Door
                else if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_FP) {
                    // 350 Note Door
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_350) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_350)) { needRefresh = true; break; }

                    // Freezeezy Peeks Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_FP) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_FP)) { needRefresh = true; break; }

                    // 450 Note Door
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_450) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_450)) { needRefresh = true; break; }
                }

                // Mad Monster Mansion Lobby
                else if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_MMM) {
                    // Mad Monster Mansion Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_MMM) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_MMM)) { needRefresh = true; break; }
                }

                // Water Tunnel / 640 Note Door
                else if (this.parent.cDB.curScn === API.SceneType.GL_NOTE_DOOR_640) {
                    // 640 Note Door
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_640) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_640)) { needRefresh = true; break; }
                }

                // Rusty Bucket Bay Lobby
                else if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_RBB) {
                    // Rusty Bucket Bay Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_RBB) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_RBB)) { needRefresh = true; break; }
                }

                // Click Clock Woods Lobby / 765 Note Door
                else if (this.parent.cDB.curScn === API.SceneType.GL_LOBBY_CCW) {
                    // Click Clock Woods Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_CCW) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_CCW)) { needRefresh = true; break; }

                    // 765 Note Door
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_765) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_765)) { needRefresh = true; break; }
                }

                // Click Clock Wood Season Lobby
                else if (this.parent.cDB.curScn === API.SceneType.CCW_MAIN) {
                    // Spring Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_DOOR_CCW_SPRING) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_DOOR_CCW_SPRING)) { needRefresh = true; break; }

                    // Summer Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_DOOR_CCW_SUMMER) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_DOOR_CCW_SUMMER)) { needRefresh = true; break; }

                    // Autumn Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_DOOR_CCW_AUTUMN) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_DOOR_CCW_AUTUMN)) { needRefresh = true; break; }

                    // Winter Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_DOOR_CCW_WINTER) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_DOOR_CCW_WINTER)) { needRefresh = true; break; }
                }

                // Gruntilda Lair Boss Door Room
                else if (this.parent.cDB.curScn === API.SceneType.GL_DINGPOT) {
                    // Boss Door Entrance
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_DOOR_GL_CRYPT) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_DOOR_GL_CRYPT)) { needRefresh = true; break; }

                    // Note Door 810
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_810) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_810)) { needRefresh = true; break; }

                    // Note Door 828
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_828) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_828)) { needRefresh = true; break; }

                    // Note Door 846
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_846) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_846)) { needRefresh = true; break; }

                    // Note Door 882
                    if (!this.get_flag(bufData, API.GameBMP.OPEN_NOTE_DOOR_882) &&
                        this.get_flag(bufStorage, API.GameBMP.OPEN_NOTE_DOOR_882)) { needRefresh = true; break; }
                }

                break;
        }

        return needRefresh;
    }

    handle_flags_honeycomb(bufData: Buffer, bufStorage: Buffer) {
        bufData = this.core.save.flags_honeycomb.get_all();
        bufStorage = this.parent.cDB.flagsHoneycomb;

        // Detect Changes
        if (!this.merge_bits(bufData, bufStorage)) return;

        // Save Changes
        this.core.save.flags_honeycomb.set_all(bufData);
        this.parent.cDB.flagsHoneycomb = bufData;

        // Sync totals
        let count = this.modloader.utils.utilBitCountBuffer(bufData, 0, 0);
        this.core.save.inventory.honeycombs = count % 6;
        this.core.save.inventory.health_upgrades = count / 6;
        this.core.runtime.current_health = count / 6 + 5;

        let pData = new Net.SyncBuffered(this.modloader.clientLobby, 'SyncHoneyCombFlags', bufData, false);
        this.modloader.clientSide.sendPacket(pData);
    }

    handle_flags_jiggy(bufData: Buffer, bufStorage: Buffer) {
        bufData = this.core.save.flags_jiggy.get_all();
        bufStorage = this.parent.cDB.flagsJiggy;

        // Detect Changes
        let needUpdate = this.merge_bits(bufData, bufStorage);

        // Sync totals
        let count = this.modloader.utils.utilBitCountBuffer(bufData, 0, 0);
        this.core.save.inventory.jiggies = count - this.parent.cDB.jiggySpent;

        if (!needUpdate) return;

        // Save Changes
        this.core.save.flags_jiggy.set_all(bufData);
        this.parent.cDB.flagsJiggy = bufData;

        let pData = new Net.SyncBuffered(this.modloader.clientLobby, 'SyncJiggyFlags', bufData, false);
        this.modloader.clientSide.sendPacket(pData);
    }

    handle_flags_token(bufData: Buffer, bufStorage: Buffer) {
        bufData = this.core.save.flags_token.get_all();
        bufStorage = this.parent.cDB.flagsToken;

        // Detect Changes
        if (!this.merge_bits(bufData, bufStorage)) return;

        // Save Changes
        this.core.save.flags_token.set_all(bufData);
        this.parent.cDB.flagsToken = bufData;

        // Sync totals
        let count = this.modloader.utils.utilBitCountBuffer(bufData, 0, 0);
        this.core.save.inventory.tokens = count - this.parent.cDB.tokensSpent;

        let pData = new Net.SyncBuffered(this.modloader.clientLobby, 'SyncMumboTokenFlags', bufData, false);
        this.modloader.clientSide.sendPacket(pData);
    }

    handle_note_totals(bufData: Buffer, bufStorage: Buffer) {
        // Initializers
        let pData: Net.SyncBuffered;
        let i: number;
        let count = 0;
        let needUpdate = false;
        bufData = this.core.save.note_totals.get_all();
        bufStorage = this.parent.cDB.noteTotals;
        count = bufData.byteLength;

        // Detect Changes
        for (i = 0; i < count; i++) {
            if (bufData[i] === bufStorage[i]) continue;
            bufData[i] = Math.max(bufData[i], bufStorage[i]);
            if (bufData[i] > 100) bufData[i] = 100;
            this.core.save.note_totals.set(i, bufData[i]);
            needUpdate = true;
        }

        // Process Changes
        if (!needUpdate) return;

        this.parent.cDB.noteTotals = bufData;
        pData = new Net.SyncBuffered(this.modloader.clientLobby, 'SyncNoteTotals', bufData, false);
        this.modloader.clientSide.sendPacket(pData);
    }

    handle_moves() {
        // Don't force sync moves on this map!
        if (this.parent.cDB.curScn === API.SceneType.GL_FURNACE_FUN) return;

        // Initializers
        let pData: Net.SyncNumbered;
        let id: number;
        let val = this.core.save.moves;
        let valDB = this.parent.cDB.moves;

        // Move Get Item Add Check
        {
            // Eggs
            id = API.MoveType.EGGS;
            if (!(val & (1 << id)) && (valDB & (1 << id))) {
                this.core.save.inventory.eggs += 50;
            }

            // Red Feathers
            id = API.MoveType.FLYING;
            if (!(val & (1 << id)) && (valDB & (1 << id))) {
                this.core.save.inventory.red_feathers += 25;
            }

            // Gold Feathers
            id = API.MoveType.WONDERWING;
            if (!(val & (1 << id)) && (valDB & (1 << id))) {
                this.core.save.inventory.gold_feathers += 5;
            }
        }

        // Detect Changes
        if (val === valDB) return;

        // Process Changes
        val |= valDB;
        this.core.save.moves = val;

        // Send Changes to Server
        this.parent.cDB.moves = val;
        pData = new Net.SyncNumbered(this.modloader.clientLobby, 'SyncMoves', val, false);
        this.modloader.clientSide.sendPacket(pData);

        // Perform heal
        let honeycombs = this.core.save.flags_honeycomb.get_all();
        let count = this.modloader.utils.utilBitCountBuffer(honeycombs, 0, 0);
        this.core.runtime.current_health = count / 6 + 5;
    }

    handle_events_level() {
        // Initializers
        let pData: Net.SyncNumbered;
        let evt = this.core.runtime.current_level_events;

        // Detect Changes
        if (evt === this.parent.cDB.levelEvents) return;

        // Process Changes
        evt |= this.parent.cDB.levelEvents;

        // Dont update while these cutscenes are active!
        if (
            (evt & API.EventLevelBMP.CUTSCENE_MM_OPENING) ||
            (evt & API.EventLevelBMP.CUTSCENE_TTC_OPENING) ||
            (evt & API.EventLevelBMP.CUTSCENE_CC_OPENING) ||
            (evt & API.EventLevelBMP.CUTSCENE_BGS_OPENING) ||
            (evt & (API.EventLevelBMP.CUTSCENE_RBB_ENGINE_ROOM_RIGHT << 24)) ||
            (evt & (API.EventLevelBMP.CUTSCENE_RBB_ENGINE_ROOM_LEFT << 24)) ||
            (evt & (API.EventLevelBMP.CUTSCENE_TTC_SANDCASTLE_WATER_LOWERED << 24)) ||
            (evt & (API.EventLevelBMP.CUTSCENE_GV_MOTE_FILLED_CUTSCENE << 24))
        ) return;

        this.parent.cDB.levelEvents = evt;
        this.core.runtime.current_level_events = evt;

        pData = new Net.SyncNumbered(this.modloader.clientLobby, 'SyncLevelEvents', evt, false);
        this.modloader.clientSide.sendPacket(pData);
    }

    handle_events_scene() {
        // Initializers
        let level = this.parent.cDB.curLvl;
        let scene = this.parent.cDB.curScn;
        let needUpdate = false;

        // Ensure we have this level/scene data!
        this.check_db_instance(this.parent.cDB, level, scene);

        let evt = this.parent.cDB.levelData[level].scene[scene].events;

        switch (this.parent.cDB.curScn) {
            case API.SceneType.SM_MAIN:
                // First Bottles Interaction
                if (this.core.save.moves !== 0) {
                    evt |= 1 << API.EventSceneBMP.SM_BOTTLES_FIRST_TALK;
                }

                // Bridge Bottles Interaction
                if (this.core.save.moves >= 0x9dB9) {
                    evt |= 1 << API.EventSceneBMP.SM_BOTTLES_TUTORIAL_FINISH;
                    evt |= 1 << API.EventSceneBMP.SM_AQUIRED_ALL_SM_ATTACKS;
                }

                // Bridge Dialogue Already Complete
                if (this.parent.cDB.levelData.hasOwnProperty(API.LevelType.GRUNTILDAS_LAIR)) {
                    evt |= 1 << API.EventSceneBMP.SM_FIST_TOP_BOTTLES_TALK;
                    evt |= 1 << API.EventSceneBMP.SM_END_TUTORIAL;
                }
            case API.SceneType.BGS_MAIN: {
                evt &= 0xfb;
            }
            case API.SceneType.GV_MAIN: {
                evt &= 0xfb;
            }
        }

        // Only safe data will get through
        if ((this.core.runtime.current_scene_events & evt) === evt &&
            !needUpdate) return;

        // Set correct data in game and to database
        this.core.runtime.current_scene_events |= evt;
        this.parent.cDB.levelData[level].scene[scene].events = evt;

        // Send changes to network
        let pData = new Net.SyncSceneNumbered(
            this.modloader.clientLobby,
            'SyncSceneEvents',
            level,
            scene,
            this.core.runtime.current_scene_events,
            false
        );
        this.modloader.clientSide.sendPacket(pData);
    }

    handle_items() {

    }

    handle_permanence_counts() {
        // Initializers
        let level = this.parent.cDB.curLvl;
        let count: number;

        // Handle Level Jinjos
        {
            this.core.save.inventory.jinjos = this.parent.cDB.levelData[level].jinjos
        }

        // Handle Scene Notes
        {
            // Totals override!
            if (this.parent.cDB.noteTotals[level] === 0x64) {
                this.core.save.inventory.notes = 0x64;
            } else {
                // Object Count
                count = this.parent.cDB.levelData[level].onotes;

                // Voxel Count
                Object.keys(this.parent.cDB.levelData[level].scene).forEach((key: string) => {
                    count += this.parent.cDB.levelData[level].scene[key].notes.length;
                });

                // Detect Changes
                if (this.core.save.inventory.notes !== count) {
                    this.parent.cDB.delVoxels = true;
                }

                // Correct Total
                this.core.save.inventory.notes = count;
            }
        }
    }

    delete_actor(ptr: number) {
        let n = this.modloader.emulator.rdramRead8(ptr + 0x47) | 0x08;
        this.modloader.emulator.rdramWrite8(ptr + 0x47, n);
    }

    handle_despawn_actors() {
        // Make sure we should activate this!
        if (!this.parent.cDB.delActors) return;

        // Reset now in case net updates durring loop
        this.parent.cDB.delActors = false;

        // Initializers
        let actor_arr_addr = global.ModLoader[API.AddressType.RT_ACTOR_ARRAY_PTR];
        let ptr = this.modloader.emulator.dereferencePointer(actor_arr_addr);
        let count = this.modloader.emulator.rdramRead32(ptr);
        let level = this.parent.cDB.curLvl;
        let subPtr: number;
        let id: number;
        let i: number;
        let val: number;
        let bit: number;

        // Get into first actor
        ptr += 0x08;

        // Loop all actors
        for (i = 0; i < count; i++) {
            subPtr = this.modloader.emulator.dereferencePointer(ptr + 0x012c);
            id = this.modloader.emulator.rdramRead16(subPtr + 2);

            switch (id) {
                case API.ActorType.EMPTY_HONEYCOMB_PIECE:
                    id = this.modloader.emulator.rdramRead32(ptr + 0x7c);
                    val = Math.floor(id / 8);
                    bit = id % 8;
                    if (bit === 0) val -= 1;
                    val = this.parent.cDB.flagsHoneycomb[val];
                    if ((val & (1 << (bit))) !== 0)
                        this.delete_actor(ptr);
                    break;

                case API.ActorType.JIGGY:
                    id = this.modloader.emulator.rdramRead32(ptr + 0x80);
                    val = Math.floor(id / 8);
                    bit = id % 8;
                    if (bit === 0) val -= 1;
                    val = this.parent.cDB.flagsJiggy[val];
                    if ((val & (1 << (bit))) !== 0)
                        this.delete_actor(ptr);
                    break;

                case API.ActorType.MUMBO_TOKEN:
                    id = this.modloader.emulator.rdramRead32(ptr + 0x7c);
                    val = Math.floor(id / 8);
                    bit = id % 8;
                    if (bit === 0) val -= 1;
                    val = this.parent.cDB.flagsToken[val];
                    if ((val & (1 << (bit))) !== 0)
                        this.delete_actor(ptr);
                    break;

                // Jinjos (By Color)
                case API.ActorType.COLLECTABLE_JINJO_BLUE:
                    val = API.JinjoType.BLUE;
                    if ((this.parent.cDB.levelData[level].jinjos & (1 << val)) !== 0) {
                        this.delete_actor(ptr);
                    }
                    break;

                case API.ActorType.COLLECTABLE_JINJO_GREEN:
                    val = API.JinjoType.GREEN;
                    if ((this.parent.cDB.levelData[level].jinjos & (1 << val)) !== 0) {
                        this.delete_actor(ptr);
                    }
                    break;

                case API.ActorType.COLLECTABLE_JINJO_ORANGE:
                    val = API.JinjoType.ORANGE;
                    if ((this.parent.cDB.levelData[level].jinjos & (1 << val)) !== 0) {
                        this.delete_actor(ptr);
                    }
                    break;

                case API.ActorType.COLLECTABLE_JINJO_PINK:
                    val = API.JinjoType.PINK;
                    if ((this.parent.cDB.levelData[level].jinjos & (1 << val)) !== 0) {
                        this.delete_actor(ptr);
                    }
                    break;

                case API.ActorType.COLLECTABLE_JINJO_YELLOW:
                    val = API.JinjoType.YELLOW;
                    if ((this.parent.cDB.levelData[level].jinjos & (1 << val)) !== 0) {
                        this.delete_actor(ptr);
                    }
                    break;

                default:
            }

            // Advance to next struct
            ptr += 0x0180;
        }
    }

    mod_voxel(ptr: number, spawn: boolean) {
        if (spawn) {
            this.modloader.emulator.rdramWrite8(ptr + 0x0B, 0x10);
        } else {
            this.modloader.emulator.rdramWrite8(ptr + 0x0B, 0x00);
        }
    }

    despawn_voxel_item(ptr: number) {
        let level = this.parent.cDB.curLvl;
        let scene = this.parent.cDB.curScn;
        let name = '';

        switch (this.modloader.emulator.rdramRead16(ptr)) {
            case 0x1640: // Notes
                // Total overrides
                if (this.parent.cDB.noteTotals[level] === 0x64) {
                    this.modloader.emulator.rdramWrite8(ptr + 0x0B, 0x00);
                } else {
                    name += "x[" + this.modloader.emulator.rdramRead16(ptr + 0x04) +
                    "]y[" + this.modloader.emulator.rdramRead16(ptr + 0x06) +
                    "]z[" + this.modloader.emulator.rdramRead16(ptr + 0x08) + "]";
                    // We have this item, despawn it
                    if (this.parent.cDB.levelData[level].scene[scene].notes.includes(name)) {
                        this.mod_voxel(ptr, false);
                    } else { // We don't have this, make it visible again!
                        this.mod_voxel(ptr, true);
                    }
                }
                break;
        }
    }

    despawn_voxel_list(ptr: number) {
        let count = (this.modloader.emulator.rdramRead32(ptr) >> 5) & 0x0000003F;
        if (count === 0) return;

        let subPtr = this.modloader.emulator.dereferencePointer(ptr + 0x08);
        let i: number;

        for (i = 0; i < count; i++) {
            if (subPtr !== 0) this.despawn_voxel_item(subPtr);

            // Advance to next list
            subPtr += 0x0C;
        }
    }

    despawn_voxel_struct() {
        // Initializers
        let voxel_arr_addr = global.ModLoader[API.AddressType.RT_VOXEL_ARRAY_PTR];
        let voxel_cnt_addr = global.ModLoader[API.AddressType.RT_VOXEL_COUNT_PTR];
        let ptr = this.modloader.emulator.dereferencePointer(voxel_arr_addr);
        let count = this.modloader.emulator.rdramRead32(voxel_cnt_addr);
        let i: number;

        for (i = 0; i < count; i++) {
            this.despawn_voxel_list(ptr);

            // Advance to next struct
            ptr += 0x0C;
        }
    }

    handle_despawn_voxels() {
        // Make sure we should activate this!
        if (!this.parent.cDB.delVoxels) return;

        // Reset now in case net updates durring loop
        this.parent.cDB.delVoxels = false;

        // Make sure we have content to delete!
        let level = this.parent.cDB.curLvl;
        let scene = this.parent.cDB.curScn;
        if (this.parent.cDB.levelData[level].scene[scene].notes.Length < 1) return;

        // Call actual despawn algorithm
        this.despawn_voxel_struct();
    }

}