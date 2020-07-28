import fs from 'fs';
import { EventHandler, EventsClient } from 'modloader64_api/EventHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { LobbyData, NetworkHandler, INetworkPlayer } from 'modloader64_api/NetworkHandler';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { BkOnline_Handlers } from './Handlers';
import * as Main from '../Main';
import * as API from 'BanjoKazooie/API/Imports';
import * as Net from '../network/Imports';

export class BkOnline_Client {
    private parent!: Main.BkOnline;

    get core(): API.IBKCore { return this.parent.core; }
    get modloader(): IModLoaderAPI { return this.parent.ModLoader; }
    get handlers(): BkOnline_Handlers { return this.parent.Handle; }

    constructor(parent: Main.BkOnline) { this.parent = parent; }

    init() { }

    // #################################################
    // ##  Utility Functions
    // #################################################

    log(input: string) {
        if (this.parent.config.print_net_client)
            this.modloader.logger.info('[Client] ' + input);
    }

    // #################################################
    // ##  Primary Events
    // #################################################

    @EventHandler(EventsClient.ON_INJECT_FINISHED)
    onClient_InjectFinished(evt: any) {
        if (this.parent.config.skip_intro)
            this.core.runtime.goto_scene(0x91, 0x00);
    }

    @EventHandler(EventsClient.ON_LOBBY_JOIN)
    onClient_LobbyJoin(lobby: LobbyData): void {
        this.parent.cDB = new Net.DatabaseClient();
        let pData = new Packet('Request_Storage', 'BkOnline', this.modloader.clientLobby, false);
        this.modloader.clientSide.sendPacket(pData);

        // Load config
        let path = './mods_settings';
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        path += '/BkOnline.json';
        if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify(this.parent.config, null, 2));
        this.parent.config = JSON.parse(fs.readFileSync(path).toString());
    }

    @EventHandler(EventsClient.ON_SERVER_CONNECTION)
    onClient_ServerConnection(evt: any) {
        this.parent.pMgr.reset();
        if (this.core.runtime === undefined || !this.core.isPlaying) return;
        let pData = new Net.SyncLocation(this.modloader.clientLobby, this.parent.cDB.curLvl, this.parent.cDB.curScn);
        this.modloader.clientSide.sendPacket(pData);
    }

    @EventHandler(EventsClient.ON_PLAYER_JOIN)
    onClient_PlayerJoin(nplayer: INetworkPlayer) {
        this.parent.pMgr.registerPuppet(nplayer);
    }

    @EventHandler(EventsClient.ON_PLAYER_LEAVE)
    onClient_PlayerLeave(nplayer: INetworkPlayer) {
        this.parent.pMgr.unregisterPuppet(nplayer);
    }

    // #################################################
    // ##  Client Receive Packets
    // #################################################

    @NetworkHandler('SyncStorage')
    onClient_SyncStorage(packet: Net.SyncStorage): void {
        this.log('Received: {Lobby Storage}');
        this.parent.cDB.flagsGame = packet.flags_game;
        this.parent.cDB.flagsHoneycomb = packet.flags_honeycomb;
        this.parent.cDB.flagsJiggy = packet.flags_jiggy;
        this.parent.cDB.flagsToken = packet.flags_token;
        this.parent.cDB.noteTotals = packet.note_totals;
        this.parent.cDB.jigsawsCompleted = packet.jigsaws_completed;
        this.parent.cDB.levelData = packet.level_data;
        this.parent.cDB.levelEvents = packet.level_events;
        this.parent.cDB.moves = packet.moves;
    }

    @NetworkHandler('SyncGameFlags')
    onClient_SyncGameFlags(packet: Net.SyncBuffered) {
        this.log('Received: {Game Flags}');

        // Detect Changes
        if (!this.handlers.merge_bits(this.parent.cDB.flagsGame, packet.value)) return;

        this.log('Updated: {Game Flags}');
    }

    @NetworkHandler('SyncHoneyCombFlags')
    onClient_SyncHoneyCombFlags(packet: Net.SyncBuffered) {
        this.log('Received: {HoneyComb Flags}');

        // Detect Changes
        if (!this.handlers.merge_bits(this.parent.cDB.flagsHoneycomb, packet.value)) return;

        this.parent.cDB.delActors = true;

        this.log('Updated: {HoneyComb Flags}');
    }

    @NetworkHandler('SyncJiggyFlags')
    onClient_SyncJiggyFlags(packet: Net.SyncBuffered) {
        this.log('Received: {Jiggy Flags}');

        // Detect Changes
        if (!this.handlers.merge_bits(this.parent.cDB.flagsJiggy, packet.value)) return;

        this.parent.cDB.delActors = true;

        this.log('Updated: {Jiggy Flags}');
    }

    @NetworkHandler('SyncMoves')
    onClient_SyncMoves(packet: Net.SyncNumbered) {
        this.log('Received: {Move Flags}');

        if (this.parent.cDB.moves === packet.value) return;
        this.parent.cDB.moves |= packet.value;

        this.log('Updated: {Move Flags}');
    }

    @NetworkHandler('SyncMumboTokenFlags')
    onClient_SyncMumboTokenFlags(packet: Net.SyncBuffered) {
        this.log('Received: {Mumbo Token Flags}');

        // Detect Changes
        if (!this.handlers.merge_bits(this.parent.cDB.flagsToken, packet.value)) return;

        this.parent.cDB.delActors = true;

        this.log('Updated: {Mumbo Token Flags}');
    }

    @NetworkHandler('SyncNoteTotals')
    onClient_SyncNoteTotals(packet: Net.SyncBuffered) {
        this.log('Received: {Note Totals}');

        let data: Buffer = this.parent.cDB.noteTotals;
        let count: number = data.byteLength;
        let i = 0;
        let needUpdate = false;

        for (i = 0; i < count; i++) {
            if (data[i] === packet.value[i]) continue;
            data[i] = Math.max(data[i], packet.value[i]);
            if (data[i] > 100) data[i] = 100;
            needUpdate = true;
        }

        if (!needUpdate) return;

        this.parent.cDB.noteTotals = data;

        this.log('Updated: {Note Totals}');
    }

    @NetworkHandler('SyncJigsaws')
    onClient_SyncJigsaws(packet: Net.SyncBuffered) {
        this.log('Received: {Jigsaws Completion}');

        let data: Buffer = this.parent.cDB.jigsawsCompleted;
        let count: number = data.byteLength;
        let i = 0;
        let needUpdate = false;

        for (i = 0; i < count; i++) {
            if (data[i] >= packet.value[i]) continue;
            if (packet.value[i] > 0) data[i] = 1;
            needUpdate = true;
        }

        if (!needUpdate) return;

        this.parent.cDB.jigsawsCompleted = data;

        this.log('Updated: {Jigsaws Completion}');
    }

    @NetworkHandler('SyncLevelEvents')
    onClient_SyncLevelEvents(packet: Net.SyncNumbered) {
        this.log('Received: {Level Events}');

        if (this.parent.cDB.levelEvents === packet.value) return;
        this.parent.cDB.levelEvents |= packet.value;

        this.log('Updated: {Level Events}');
    }

    // Puppet Tracking

    @NetworkHandler('Request_Scene')
    onClient_RequestScene(packet: Packet) {
        let level = -1;
        let scene = -1;

        if (!(this.core.runtime === undefined || !this.core.isPlaying)) {
            level = this.parent.cDB.curLvl;
            scene = this.parent.cDB.curScn;
        }

        let pData = new Net.SyncLocation(packet.lobby, level, scene);
        this.modloader.clientSide.sendPacketToSpecificPlayer(pData, packet.player);
    }

    @NetworkHandler('SyncLocation')
    onClient_SyncLocation(packet: Net.SyncLocation) {
        let pMsg = 'Player[' + packet.player.nickname + ']';
        let lMsg = 'Level[' + API.LevelType[packet.level] + ']';
        let sMsg = 'Scene[' + API.SceneType[packet.scene] + ']';
        this.parent.pMgr.changePuppetScene(packet.player, packet.scene);
        this.log('Received: {Player Scene}');
        this.log('Updated: ' + pMsg + ' to ' + sMsg + ' of ' + lMsg);

        if (packet.level === API.LevelType.UNKNOWN ||
            packet.scene === API.SceneType.UNKNOWN) return;

        this.handlers.check_db_instance(this.parent.cDB, packet.level, packet.scene);
    }

    @NetworkHandler('SyncPuppet')
    onClient_SyncPuppet(packet: Net.SyncPuppet) {
        this.parent.pMgr.handlePuppet(packet);
    }

    // Level Tracking

    @NetworkHandler('SyncJinjos')
    onClient_SyncJinjos(packet: Net.SyncLevelNumbered) {
        this.log('Received: {Jinjo}');

        let level = packet.level;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(this.parent.cDB, level, 0);

        let map = this.parent.cDB.levelData[level];
        if (map.jinjos === packet.value) return;
        map.jinjos |= packet.value;

        // Mark we need to delete the note if in same scene!
        if (this.parent.cDB.curLvl === packet.level) {
            this.parent.cDB.delActors = true;
        }

        this.log('Updated: {Jinjo}');
    }

    @NetworkHandler('SyncObjectNotes')
    onClient_SyncObjectNotes(packet: Net.SyncLevelNumbered) {
        this.log('Received: {Level Note Count}');

        let level = packet.level;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(this.parent.cDB, level, 0);

        let map = this.parent.cDB.levelData[level];
        if (map.onotes >= packet.value) return;
        map.onotes = packet.value;

        this.log('Updated: {Level Note Count}');
    }

    @NetworkHandler('SyncVoxelNotes')
    onClient_SyncVoxelNotes(packet: Net.SyncVoxelNotes) {
        this.log('Received: {Level Note Count}');

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(this.parent.cDB, level, scene);

        let map = this.parent.cDB.levelData[level].scene[scene];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.notes.length; i++) {
            if (!map.notes.includes(packet.notes[i])) {
                map.notes.push(packet.notes[i]);
                needsUpdate = true;
            }
        }

        if (!needsUpdate) return;

        // Mark we need to delete the note if in same scene!
        if (this.parent.cDB.curScn === packet.scene) {
            this.parent.cDB.delVoxels = true;
        }

        this.log('Updated: {Level Note Count}');
    }

    @NetworkHandler('SyncGold')
    onClient_SyncGold(packet: Net.SyncGold) {
        this.log('Received: {Level Specific - Gold Bullions}');

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(this.parent.cDB, level, scene);

        let map = this.parent.cDB.levelData[level];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.gold.length; i++) {
            if (!map.g.includes(packet.gold[i])) {
                map.gold.push(packet.gold[i]);
                needsUpdate = true;
            }
        }

        if (!needsUpdate) return;

        // Mark we need to delete the gold if in same scene!
        if (this.parent.cDB.curScn === packet.scene) {
            this.parent.cDB.delVoxels = true;
        }

        this.log('Updated: {Level Specific - Gold Bullions}');
    }

    @NetworkHandler('SyncPresents')
    onClient_SyncPresents(packet: Net.SyncPresents) {
        this.log('Received: {Level Specific - Presents}');

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(this.parent.cDB, level, scene);

        let map = this.parent.cDB.levelData[level];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.presents.length; i++) {
            if (!map.presents.includes(packet.presents[i])) {
                map.presents.push(packet.presents[i]);
                needsUpdate = true;
            }
        }

        if (!map.present_b !== packet.blue) map.present_b = map.present_b || packet.blue;
        if (!map.present_g !== packet.green) map.present_g = map.present_g || packet.green;
        if (!map.present_r !== packet.red) map.present_r = map.present_r || packet.red;

        if (!needsUpdate) return;

        // Mark we need to delete the gold if in same scene!
        if (this.parent.cDB.curScn === packet.scene) {
            this.parent.cDB.delVoxels = true;
        }

        this.log('Updated: {Level Specific - Presents}');
    }

    @NetworkHandler('SyncCaterpillars')
    onClient_SyncCaterpillars(packet: Net.SyncCaterpillars) {
        this.log('Received: {Level Specific - Caterpillars}');

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(this.parent.cDB, level, scene);

        let map = this.parent.cDB.levelData[level];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.caterpillars.length; i++) {
            if (!map.g.includes(packet.caterpillars[i])) {
                map.caterpillars.push(packet.caterpillars[i]);
                needsUpdate = true;
            }
        }

        if (!needsUpdate) return;

        // Mark we need to delete the caterpillars if in same scene!
        if (this.parent.cDB.curScn === packet.scene) {
            this.parent.cDB.delVoxels = true;
        }

        this.log('Updated: {Level Specific - Caterpillars}');
    }

    @NetworkHandler('SyncAcorns')
    onClient_SyncAcorns(packet: Net.SyncAcorns) {
        this.log('Received: {Level Specific - Acorns}');

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(this.parent.cDB, level, scene);

        let map = this.parent.cDB.levelData[level];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.acorns.length; i++) {
            if (!map.g.includes(packet.acorns[i])) {
                map.acorns.push(packet.acorns[i]);
                needsUpdate = true;
            }
        }

        if (!needsUpdate) return;

        // Mark we need to delete the acorns if in same scene!
        if (this.parent.cDB.curScn === packet.scene) {
            this.parent.cDB.delVoxels = true;
        }

        this.log('Updated: {Level Specific - Acorns}');
    }
}