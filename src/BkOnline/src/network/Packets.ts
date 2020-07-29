import { Packet, UDPPacket } from 'modloader64_api/ModLoaderDefaultImpls';
import * as DB from './Database';
import * as PData from '../puppet/Instance';

export class SyncStorage extends Packet {
    file: DB.FileData[];
    constructor(
        lobby: string,
        file: DB.FileData[]
    ) {
        super('SyncStorage', 'BkOnline', lobby, false);
        this.file = file;
    }
}

export class SyncBuffered extends Packet {
    team: number;
    value: Buffer;
    constructor(
        lobby: string,
        header: string,
        team: number,
        value: Buffer,
        persist: boolean
    ) {
        super(header, 'BkOnline', lobby, persist);
        this.team = team;
        this.value = value;
    }
}

export class SyncNumbered extends Packet {
    team: number;
    value: number;
    constructor(
        lobby: string,
        header: string,
        team: number,
        value: number,
        persist: boolean
    ) {
        super(header, 'BkOnline', lobby, persist);
        this.team = team;
        this.value = value;
    }
}

// #################################################
// ##  Puppet Tracking
// #################################################

export class SyncPuppet extends UDPPacket {
    puppet: PData.Data;
    constructor(lobby: string, value: PData.Data) {
        super('SyncPuppet', 'BkOnline', lobby, false);
        this.puppet = value;
    }
}

export class SyncLocation extends Packet {
    team: number;
    level: number;
    scene: number;
    constructor(lobby: string, team: number, level: number, scene: number) {
        super('SyncLocation', 'BkOnline', lobby, true);
        this.team = team;
        this.level = level;
        this.scene = scene;
    }
}

// #################################################
// ##  Level Tracking
// #################################################

export class SyncLevelNumbered extends Packet {
    team: number;
    level: number;
    value: number;
    constructor(
        lobby: string,
        header: string,
        team: number,
        level: number,
        value: number,
        persist: boolean
    ) {
        super(header, 'BkOnline', lobby, persist);
        this.team = team;
        this.level = level;
        this.value = value;
    }
}

// #################################################
// ##  Scene Tracking
// #################################################

export class SyncSceneNumbered extends Packet {
    team: number;
    level: number;
    scene: number;
    value: number;
    constructor(
        lobby: string,
        header: string,
        team: number,
        level: number,
        scene: number,
        value: number,
        persist: boolean
    ) {
        super(header, 'BkOnline', lobby, persist);
        this.team = team;
        this.level = level;
        this.scene = scene;
        this.value = value;
    }
}

export class SyncVoxelNotes extends Packet {
    team: number;
    level: number;
    scene: number;
    notes: number[];
    constructor(
        lobby: string,
        team: number,
        level: number,
        scene: number,
        notes: number[],
        persist: boolean
    ) {
        super('SyncVoxelNotes', 'BkOnline', lobby, persist);
        this.team = team;
        this.level = level;
        this.scene = scene;
        this.notes = notes;
    }
}

export class SyncGold extends Packet {
    team: number;
    level: number;
    scene: number;
    gold: number[];
    constructor(
        lobby: string,
        team: number,
        level: number,
        scene: number,
        gold: number[],
        persist: boolean
    ) {
        super('SyncGold', 'BkOnline', lobby, persist);
        this.team = team;
        this.level = level;
        this.scene = scene;
        this.gold = gold;
    }
}

export class SyncPresents extends Packet {
    team: number;
    level: number;
    scene: number;
    presents: number[];
    blue: boolean;
    green: boolean;
    red: boolean;
    constructor(
        lobby: string,
        team: number,
        level: number,
        scene: number,
        presents: number[],
        blue: boolean,
        green: boolean,
        red: boolean,
        persist: boolean
    ) {
        super('SyncPresents', 'BkOnline', lobby, persist);
        this.team = team;
        this.level = level;
        this.scene = scene;
        this.presents = presents;
        this.blue = blue;
        this.green = green;
        this.red = red;
    }
}

export class SyncCaterpillars extends Packet {
    team: number;
    level: number;
    scene: number;
    caterpillars: number[];
    constructor(
        lobby: string,
        team: number,
        level: number,
        scene: number,
        caterpillars: number[],
        persist: boolean
    ) {
        super('SyncCaterpillars', 'BkOnline', lobby, persist);
        this.team = team;
        this.level = level;
        this.scene = scene;
        this.caterpillars = caterpillars;
    }
}

export class SyncAcorns extends Packet {
    team: number;
    level: number;
    scene: number;
    acorns: number[];
    constructor(
        lobby: string,
        team: number,
        level: number,
        scene: number,
        acorns: number[],
        persist: boolean
    ) {
        super('SyncAcorns', 'BkOnline', lobby, persist);
        this.team = team;
        this.level = level;
        this.scene = scene;
        this.acorns = acorns;
    }
}