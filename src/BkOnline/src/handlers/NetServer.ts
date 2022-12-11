import { EventHandler, EventsServer, EventServerJoined, EventServerLeft } from 'modloader64_api/EventHandler';
import { IModLoaderAPI } from 'modloader64_api/IModLoaderAPI';
import { ServerNetworkHandler } from 'modloader64_api/NetworkHandler';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import { BkOnline_Handlers } from './Handlers';
import * as Main from '../Main';
import * as API from 'BanjoKazooie/API/Imports';
import * as Net from '../network/Imports';

export class BkOnline_Server {
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
        if (this.parent.config.print_net_server)
            this.modloader.logger.info('[Server] ' + input);
    }

    sDB(lobby: string): Net.DatabaseServer {
        return this.modloader.lobbyManager.getLobbyStorage(lobby, this.parent);
    }

    // #################################################
    // ##  Primary Events
    // #################################################

    @EventHandler(EventsServer.ON_LOBBY_CREATE)
    onServer_LobbyCreate(lobby: string) {
        this.modloader.lobbyManager.createLobbyStorage(
            lobby,
            this.parent,
            new Net.DatabaseServer()
        );
    }

    @EventHandler(EventsServer.ON_LOBBY_JOIN)
    onServer_LobbyJoin(evt: EventServerJoined) {
        let sDB = this.sDB(evt.lobby);
        sDB.players[evt.player.uuid] = -1;
        sDB.playerInstances[evt.player.uuid] = evt.player;
    }

    @EventHandler(EventsServer.ON_LOBBY_LEAVE)
    onServer_LobbyLeave(evt: EventServerLeft) {
        let sDB = this.sDB(evt.lobby);
        delete sDB.players[evt.player.uuid];
        delete sDB.playerInstances[evt.player.uuid];
    }

    // #################################################
    // ##  Server Receive Packets
    // #################################################

    @ServerNetworkHandler('Request_Storage')
    onServer_RequestStorage(packet: Packet): void {
        this.log('Sending: {Lobby Storage}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let pData = new Net.SyncStorage(
            packet.lobby,
            sDB.file
        );
        this.modloader.serverSide.sendPacketToSpecificPlayer(pData, packet.player);
    }

    @ServerNetworkHandler('SyncCheatFlags')
    onServer_SyncCheatFlags(packet: Net.SyncBuffered) {
        this.log('Received: {Cheat Flags}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        // Detect Changes
        if (!this.handlers.merge_bits(sDB.file[packet.team].flagsCheat, packet.value)) return;

        let pData = new Net.SyncBuffered(packet.lobby, 'SyncCheatFlags', packet.team, sDB.file[packet.team].flagsCheat, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Cheat Flags}');
    }

    @ServerNetworkHandler('SyncGameFlags')
    onServer_SyncGameFlags(packet: Net.SyncBuffered) {
        this.log('Received: {Game Flags}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        // Detect Changes
        if (!this.handlers.merge_bits(sDB.file[packet.team].flagsGame, packet.value)) return;

        let pData = new Net.SyncBuffered(packet.lobby, 'SyncGameFlags', packet.team, sDB.file[packet.team].flagsGame, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Game Flags}');
    }

    @ServerNetworkHandler('SyncHoneyCombFlags')
    onServer_SyncHoneyCombFlags(packet: Net.SyncBuffered) {
        this.log('Received: {HoneyComb Flags}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        // Detect Changes
        if (!this.handlers.merge_bits(sDB.file[packet.team].flagsHoneycomb, packet.value)) return;

        let pData = new Net.SyncBuffered(packet.lobby, 'SyncHoneyCombFlags', packet.team, sDB.file[packet.team].flagsHoneycomb, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {HoneyComb Flags}');
    }

    @ServerNetworkHandler('SyncJiggyFlags')
    onServer_SyncJiggyFlags(packet: Net.SyncBuffered) {
        this.log('Received: {Jiggy Flags}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        // Detect Changes
        if (!this.handlers.merge_bits(sDB.file[packet.team].flagsJiggy, packet.value)) return;

        let pData = new Net.SyncBuffered(packet.lobby, 'SyncJiggyFlags', packet.team, sDB.file[packet.team].flagsJiggy, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Jiggy Flags}');
    }

    @ServerNetworkHandler('SyncMoves')
    onServer_SyncMoves(packet: Net.SyncNumbered) {
        this.log('Received: {Move Flags}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        if (sDB.file[packet.team].moves === packet.value) return;
        sDB.file[packet.team].moves |= packet.value;

        let pData = new Net.SyncNumbered(packet.lobby, 'SyncMoves', packet.team, sDB.file[packet.team].moves, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Move Flags}');
    }

    @ServerNetworkHandler('SyncMumboTokenFlags')
    onServer_SyncMumboTokenFlags(packet: Net.SyncBuffered) {
        this.log('Received: {Mumbo Token Flags}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        // Detect Changes
        if (!this.handlers.merge_bits(sDB.file[packet.team].flagsToken, packet.value)) return;

        let pData = new Net.SyncBuffered(packet.lobby, 'SyncMumboTokenFlags', packet.team, sDB.file[packet.team].flagsToken, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Mumbo Token Flags}');
    }

    @ServerNetworkHandler('SyncNoteTotals')
    onServer_SyncSyncNoteTotals(packet: Net.SyncBuffered) {
        this.log('Received: {Note Totals}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let data: Buffer = sDB.file[packet.team].noteTotals;
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

        sDB.file[packet.team].noteTotals = data;

        let pData = new Net.SyncBuffered(packet.lobby, 'SyncNoteTotals', packet.team, data, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Note Totals}');
    }

    @ServerNetworkHandler('SyncJigsaws')
    onServer_SyncJigsaws(packet: Net.SyncBuffered) {
        this.log('Received: {Jigsaws Completion}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let data: Buffer = sDB.file[packet.team].jigsawsCompleted;
        let count: number = data.byteLength;
        let i = 0;
        let needUpdate = false;

        for (i = 0; i < count; i++) {
            if (data[i] >= packet.value[i]) continue;
            if (packet.value[i] > 0) data[i] = 1;
            needUpdate = true;
        }

        if (!needUpdate) return;

        sDB.file[packet.team].jigsawsCompleted = data;

        let pData = new Net.SyncBuffered(packet.lobby, 'SyncJigsaws', packet.team, data, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Jigsaws Completion}');
    }

    @ServerNetworkHandler('SyncLevelEvents')
    onServer_SyncLevelEvents(packet: Net.SyncNumbered) {
        this.log('Received: {Level Events}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        if (sDB.file[packet.team].levelEvents === packet.value) return;
        sDB.file[packet.team].levelEvents |= packet.value;

        let pData = new Net.SyncNumbered(packet.lobby, 'SyncLevelEvents', packet.team, sDB.file[packet.team].levelEvents, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Level Events}');
    }

    // Puppet Tracking

    @ServerNetworkHandler('SyncLocation')
    onServer_SyncLocation(packet: Net.SyncLocation) {
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let pMsg = 'Player[' + packet.player.nickname + ']';
        let lMsg = 'Level[' + API.LevelType[packet.level] + ']';
        let sMsg = 'Scene[' + API.SceneType[packet.scene] + ']';
        sDB.players[packet.player.uuid] = packet.scene;
        this.log('Received: {Player Scene}');
        this.log('Updated: ' + pMsg + ' to ' + sMsg + ' of ' + lMsg);

        if (packet.level === API.LevelType.UNKNOWN ||
            packet.scene === API.SceneType.UNKNOWN) return;

        this.handlers.check_db_instance(sDB, packet.team, packet.level, packet.scene);
    }

    @ServerNetworkHandler('SyncPuppet')
    onServer_SyncPuppet(packet: Net.SyncPuppet) {
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        Object.keys(sDB.players).forEach((key: string) => {
            if (sDB.players[key] !== sDB.players[packet.player.uuid]) {
                return;
            }

            if (!sDB.playerInstances.hasOwnProperty(key)) return;
            if (sDB.playerInstances[key].uuid === packet.player.uuid) {
                return;
            }

            this.modloader.serverSide.sendPacketToSpecificPlayer(
                packet,
                sDB.playerInstances[key]
            );
        });
    }

    // Level Tracking

    @ServerNetworkHandler('SyncJinjos')
    onServer_SyncJinjos(packet: Net.SyncLevelNumbered) {
        this.log('Received: {Jinjo}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let level = packet.level;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(sDB, packet.team, level, 0);

        let map = sDB.file[packet.team].levelData[level];
        if (map.jinjos === packet.value) return;
        map.jinjos |= packet.value;

        // Check Jinjo Count
        if (sDB.file[packet.team].levelData[level].jinjos === 0x1f) {
            // Set level specific jiggy flag
            let offset = 0;

            switch (packet.level) {
                case API.LevelType.MUMBOS_MOUNTAIN:
                    offset = 0x01;
                    break;
                case API.LevelType.TREASURE_TROVE_COVE:
                    offset = 0x0b;
                    break;
                case API.LevelType.CLANKERS_CAVERN:
                    offset = 0x15;
                    break;
                case API.LevelType.BUBBLE_GLOOP_SWAMP:
                    offset = 0x1f;
                    break;
                case API.LevelType.FREEZEEZY_PEAK:
                    offset = 0x29;
                    break;
                case API.LevelType.GOBEYS_VALEY:
                    offset = 0x3d;
                    break;
                case API.LevelType.CLICK_CLOCK_WOODS:
                    offset = 0x47;
                    break;
                case API.LevelType.RUSTY_BUCKET_BAY:
                    offset = 0x51;
                    break;
                case API.LevelType.MAD_MONSTER_MANSION:
                    offset = 0x5b;
                    break;
            }

            sDB.file[packet.team].flagsJiggy[Math.floor(offset / 8)] |= 1 << (offset % 8);
            let pData = new Net.SyncBuffered(packet.lobby, 'SyncJiggyFlags', packet.team, sDB.file[packet.team].flagsJiggy, true);
            this.modloader.serverSide.sendPacket(pData);
        }

        let pData = new Net.SyncLevelNumbered(
            packet.lobby,
            'SyncJinjos',
            packet.team,
            level,
            map.jinjos,
            true
        );
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Jinjo}');
    }

    @ServerNetworkHandler('SyncJiggyCount')
    onServer_SyncJiggyCount(packet: Net.SyncLevelNumbered) {
        this.log('Received: {Level Specific - Jiggies}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let level = packet.level;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(sDB, packet.team, level, 0);

        let map = sDB.file[packet.team].levelData[level];
        if (map.jiggies < packet.value) return;
        map.jiggies = packet.value;

        let pData = new Net.SyncLevelNumbered(
            packet.lobby,
            'SyncJiggyCount',
            packet.team,
            level,
            map.jiggies,
            true
        );
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Level Specific - Jiggies}');
    }

    @ServerNetworkHandler('SyncObjectNotes')
    onServer_SyncObjectNotes(packet: Net.SyncLevelNumbered) {
        this.log('Received: {Level Note Count}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let level = packet.level;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(sDB, packet.team, level, 0);

        let map = sDB.file[packet.team].levelData[level];
        if (map.onotes >= packet.value) return;
        map.onotes = packet.value;

        let pData = new Net.SyncLevelNumbered(packet.lobby, 'SyncObjectNotes', packet.team, level, map.onotes, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Level Note Count}');
    }

    @ServerNetworkHandler('SyncVoxelNotes')
    onServer_SyncVoxelNotes(packet: Net.SyncVoxelNotes) {
        this.log('Received: {Level Note Count}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(sDB, packet.team, level, scene);

        let map = sDB.file[packet.team].levelData[level].scene[scene];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.notes.length; i++) {
            if (!map.notes.includes(packet.notes[i])) {
                map.notes.push(packet.notes[i]);
                needsUpdate = true;
            }
        }

        if (!needsUpdate) return;

        let pData = new Net.SyncVoxelNotes(packet.lobby, packet.team, level, scene, map.notes, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Level Note Count}');
    }

    @ServerNetworkHandler('SyncGold')
    onServer_SyncGold(packet: Net.SyncGold) {
        this.log('Received: {Level Specific - Gold Bullions}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(sDB, packet.team, level, scene);

        let map = sDB.file[packet.team].levelData[level];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.gold.length; i++) {
            if (!map.gold.includes(packet.gold[i])) {
                map.gold.push(packet.gold[i]);
                needsUpdate = true;
            }
        }

        if (!needsUpdate) return;

        let pData = new Net.SyncGold(packet.lobby, packet.team, level, scene, map.gold, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Level Specific - Gold Bullions}');
    }

    @ServerNetworkHandler('SyncPresents')
    onServer_SyncPresents(packet: Net.SyncPresents) {
        this.log('Received: {Level Specific - Presents}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(sDB, packet.team, level, scene);

        let map = sDB.file[packet.team].levelData[level];
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

        let pData = new Net.SyncPresents(
            packet.lobby,
            packet.team,
            level, scene,
            map.presents,
            map.blue,
            map.green,
            map.red,
            true
        );
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Level Specific - Presents}');
    }

    @ServerNetworkHandler('SyncCaterpillars')
    onServer_SyncCaterpillars(packet: Net.SyncCaterpillars) {
        this.log('Received: {Level Specific - Caterpillars}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(sDB, packet.team, level, scene);

        let map = sDB.file[packet.team].levelData[level];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.caterpillars.length; i++) {
            if (!map.caterpillars.includes(packet.caterpillars[i])) {
                map.caterpillars.push(packet.caterpillars[i]);
                needsUpdate = true;
            }
        }

        if (!needsUpdate) return;

        let pData = new Net.SyncCaterpillars(packet.lobby, packet.team, level, scene, map.caterpillars, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Level Specific - Caterpillars}');
    }

    @ServerNetworkHandler('SyncAcorns')
    onServer_SyncAcorns(packet: Net.SyncAcorns) {
        this.log('Received: {Level Specific - Acorns}');
        let sDB = this.sDB(packet.lobby);
        if (sDB === null) return;

        let level = packet.level;
        let scene = packet.scene;

        // Ensure we have this level/scene data!
        this.handlers.check_db_instance(sDB, packet.team, level, scene);

        let map = sDB.file[packet.team].levelData[level];
        let i = 0;
        let needsUpdate = false;

        for (i = 0; i < packet.acorns.length; i++) {
            if (!map.acorns.includes(packet.acorns[i])) {
                map.acorns.push(packet.acorns[i]);
                needsUpdate = true;
            }
        }

        if (!needsUpdate) return;

        let pData = new Net.SyncAcorns(packet.lobby, packet.team, level, scene, map.acorns, true);
        this.modloader.serverSide.sendPacket(pData);

        this.log('Updated Team[' + API.ProfileType[packet.team] + ']: {Level Specific - Acorns}');
    }
}