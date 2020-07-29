import { Packet, UDPPacket } from 'modloader64_api/ModLoaderDefaultImpls';
import * as PData from '../puppet/Instance';

export class SyncStorage extends Packet {
    flags_cheat: Buffer;
    flags_game: Buffer;
    flags_jiggy: Buffer;
    flags_honeycomb: Buffer;
    flags_token: Buffer;
    note_totals: Buffer;
    jigsaws_completed: Buffer;
    level_data: any;
    level_events: number;
    moves: number;
    constructor(
        lobby: string,
        flags_cheat: Buffer,
        flags_game: Buffer,
        flags_honeycomb: Buffer,
        flags_jiggy: Buffer,
        flags_token: Buffer,
        note_totals: Buffer,
        jigsaws_completed: Buffer,
        level_data: any,
        level_events: number,
        moves: number
    ) {
        super('SyncStorage', 'BkOnline', lobby, false);
        this.flags_cheat = flags_cheat;
        this.flags_game = flags_game;
        this.flags_honeycomb = flags_honeycomb;
        this.flags_jiggy = flags_jiggy;
        this.flags_token = flags_token;
        this.note_totals = note_totals;
        this.jigsaws_completed = jigsaws_completed;
        this.level_data = level_data;
        this.level_events = level_events;
        this.moves = moves;
    }
}

export class SyncBuffered extends Packet {
    value: Buffer;
    constructor(lobby: string, header: string, value: Buffer, persist: boolean) {
        super(header, 'BkOnline', lobby, persist);
        this.value = value;
    }
}

export class SyncNumbered extends Packet {
    value: number;
    constructor(lobby: string, header: string, value: number, persist: boolean) {
        super(header, 'BkOnline', lobby, persist);
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
    level: number;
    scene: number;
    constructor(lobby: string, level: number, scene: number) {
        super('SyncLocation', 'BkOnline', lobby, true);
        this.level = level;
        this.scene = scene;
    }
}

// #################################################
// ##  Level Tracking
// #################################################

export class SyncLevelNumbered extends Packet {
    level: number;
    value: number;
    constructor(
        lobby: string,
        header: string,
        level: number,
        value: number,
        persist: boolean
    ) {
        super(header, 'BkOnline', lobby, persist);
        this.level = level;
        this.value = value;
    }
}

// #################################################
// ##  Scene Tracking
// #################################################

export class SyncSceneNumbered extends Packet {
    level: number;
    scene: number;
    value: number;
    constructor(
        lobby: string,
        header: string,
        level: number,
        scene: number,
        value: number,
        persist: boolean
    ) {
        super(header, 'BkOnline', lobby, persist);
        this.level = level;
        this.scene = scene;
        this.value = value;
    }
}

export class SyncVoxelNotes extends Packet {
    level: number;
    scene: number;
    notes: number[];
    constructor(
        lobby: string,
        level: number,
        scene: number,
        notes: number[],
        persist: boolean
    ) {
        super('SyncVoxelNotes', 'BkOnline', lobby, persist);
        this.level = level;
        this.scene = scene;
        this.notes = notes;
    }
}

export class SyncGold extends Packet {
    level: number;
    scene: number;
    gold: number[];
    constructor(
        lobby: string,
        level: number,
        scene: number,
        gold: number[],
        persist: boolean
    ) {
        super('SyncGold', 'BkOnline', lobby, persist);
        this.level = level;
        this.scene = scene;
        this.gold = gold;
    }
}

export class SyncPresents extends Packet {
    level: number;
    scene: number;
    presents: number[];
    blue: boolean;
    green: boolean;
    red: boolean;
    constructor(
        lobby: string,
        level: number,
        scene: number,
        presents: number[],
        blue: boolean,
        green: boolean,
        red: boolean,
        persist: boolean
    ) {
        super('SyncPresents', 'BkOnline', lobby, persist);
        this.level = level;
        this.scene = scene;
        this.presents = presents;
        this.blue = blue;
        this.green = green;
        this.red = red;
    }
}

export class SyncCaterpillars extends Packet {
    level: number;
    scene: number;
    caterpillars: number[];
    constructor(
        lobby: string,
        level: number,
        scene: number,
        caterpillars: number[],
        persist: boolean
    ) {
        super('SyncCaterpillars', 'BkOnline', lobby, persist);
        this.level = level;
        this.scene = scene;
        this.caterpillars = caterpillars;
    }
}

export class SyncAcorns extends Packet {
    level: number;
    scene: number;
    acorns: number[];
    constructor(
        lobby: string,
        level: number,
        scene: number,
        acorns: number[],
        persist: boolean
    ) {
        super('SyncAcorns', 'BkOnline', lobby, persist);
        this.level = level;
        this.scene = scene;
        this.acorns = acorns;
    }
}