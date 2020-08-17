import { IModLoaderAPI, IPlugin, IPluginServerConfig } from 'modloader64_api/IModLoaderAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import * as API from 'BanjoKazooie/API/Imports';
import * as Hnd from './handlers/Imports';
import * as Net from './network/Imports';
import * as Puppet from './puppet/Imports';

export interface IConfig {
    bear_bird: string;
    termite: string;
    crocodile: string;
    walrus: string;
    pumpkin: string;
    bee: string;
    print_events_level: boolean;
    print_events_scene: boolean;
    print_net_client: boolean;
    print_net_server: boolean;
    skip_intro: boolean;
}

export class BkOnline implements IPlugin, IPluginServerConfig {
    @InjectCore() core!: API.IBKCore;
    ModLoader = {} as IModLoaderAPI;
    name = 'BkOnline';

    cDB!: Net.DatabaseClient;
    pMgr!: Puppet.PuppetManager;

    Handle!: Hnd.BkOnline_Handlers;
    Client!: Hnd.BkOnline_Client
    Server!: Hnd.BkOnline_Server

    config: IConfig = {
        bear_bird: "BANJO_KAZOOIE",
        termite: "BANJO_TERMITE",
        crocodile: "BANJO_CROCODILE",
        walrus: "BANJO_WALRUS",
        pumpkin: "BANJO_PUMPKIN",
        bee: "BANJO_BEE",
        print_events_level: false,
        print_events_scene: false,
        print_net_client: false,
        print_net_server: false,
        skip_intro: true
    };

    constructor() {
        // Construct sub-modules
        this.Handle = new Hnd.BkOnline_Handlers(this);
        this.Client = new Hnd.BkOnline_Client(this);
        this.Server = new Hnd.BkOnline_Server(this);
    }

    preinit(): void { this.pMgr = new Puppet.PuppetManager(); }

    init(): void {
        // Init sub-modules
        this.Handle.init();
        this.Client.init();
        this.Server.init();
    }

    postinit(): void {
        // Puppet Manager Inject
        this.pMgr.postinit(
            this.ModLoader.emulator,
            this.core,
            this.ModLoader.me,
            this.ModLoader
        );

        this.ModLoader.logger.info('Puppet manager activated.');

        // Load Character
        const val_bear_bird: API.CharacterType | undefined = (<any>API.CharacterType)[this.config.bear_bird];
        if (val_bear_bird !== undefined) this.core.character.bear_bird_id = val_bear_bird;
        
        const val_termite: API.CharacterType | undefined = (<any>API.CharacterType)[this.config.termite];
        if (val_termite !== undefined) this.core.character.termite_id = val_termite;
        
        const val_crocodile: API.CharacterType | undefined = (<any>API.CharacterType)[this.config.crocodile];
        if (val_crocodile !== undefined) this.core.character.crocodile_id = val_crocodile;
        
        const val_walrus: API.CharacterType | undefined = (<any>API.CharacterType)[this.config.walrus];
        if (val_walrus !== undefined) this.core.character.walrus_id = val_walrus;
        
        const val_pumpkin: API.CharacterType | undefined = (<any>API.CharacterType)[this.config.pumpkin];
        if (val_pumpkin !== undefined) this.core.character.pumpkin_id = val_pumpkin;
        
        const val_bee: API.CharacterType | undefined = (<any>API.CharacterType)[this.config.bee];
        if (val_bee !== undefined) this.core.character.bee_id = val_bee;
    }

    onTick(): void { this.Handle.tick(); }

    getServerURL(): string { return "158.69.60.101:8000"; }
}