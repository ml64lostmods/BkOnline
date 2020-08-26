export class FileData {
    flagsCheat: Buffer = Buffer.alloc(0x19);
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

export class Database {
    file: FileData[] = Array<FileData>(3);

    constructor() {
        this.file[0] = new FileData();
        this.file[1] = new FileData();
        this.file[2] = new FileData();
        this.file[3] = new FileData();
    }
}

export class DatabaseClient extends Database {
    tutorialComplete: boolean[] = Array<boolean>(3);

    team: number = 3;
    curLvl: number = 0;
    curScn: number = 0;
    oNoteCount: number = 0;
    jiggySpent: number = 0;
    tokensSpent: number = 0;
    delActors: boolean = false;
    delVoxels: boolean = false;
    reloadMap: boolean = false;
    
    constructor() {
        super();
        this.tutorialComplete[0] = false;
        this.tutorialComplete[1] = false;
        this.tutorialComplete[2] = false;
        this.tutorialComplete[3] = false;
    }
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

    // Level Specific
    gold: number[] = new Array<number>();
    presents: number[] = new Array<number>();
    caterpillars: number[] = new Array<number>();
    acorns: number[] = new Array<number>();

    present_b: boolean = false;
    present_g: boolean = false;
    present_r: boolean = false;
}

export class SceneData {
    notes: number[] = new Array<number>();
    events: number = 0;
}