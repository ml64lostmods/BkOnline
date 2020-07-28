export class Database {
    flagsGame: Buffer = Buffer.alloc(0x20);
    flagsHoneycomb: Buffer = Buffer.alloc(0x03);
    flagsJiggy: Buffer = Buffer.alloc(0x0d);
    flagsToken: Buffer = Buffer.alloc(0x10);
    noteTotals: Buffer = Buffer.alloc(0x0f);
    jigsawsCompleted: Buffer = Buffer.alloc(11);
    levelData: any = {};
    levelEvents: number = 0;
    moves: number = 0;
}

export class DatabaseClient extends Database {
    curLvl: number = 0;
    curScn: number = 0;
    oNoteCount: number = 0;
    jiggySpent: number = 0;
    tokensSpent: number = 0;
    delActors: boolean = false;
    delVoxels: boolean = false;
    reloadMap: boolean = false;
}

export class DatabaseServer extends Database {
    // Puppets
    playerInstances: any = {};
    players: any = {};
}

export class LevelData {
    // Main
    scene: any = {};
    onotes: number = 0;
    jinjos: number = 0;
}

export class SceneData {
    items: number[] = new Array<number>();
    notes: number[] = new Array<number>();
    events: number = 0;
}