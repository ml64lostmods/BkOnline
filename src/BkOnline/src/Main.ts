import { IModLoaderAPI, IPlugin, IPluginServerConfig } from 'modloader64_api/IModLoaderAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { DiscordStatus } from 'modloader64_api/Discord';
import * as API from 'BanjoKazooie/API/Imports';
import * as Hnd from './handlers/Imports';
import * as Net from './network/Imports';
import * as Puppet from './puppet/Imports';

export interface IConfig {
    play_as_puppet: boolean;
    print_events_level: boolean;
    print_events_scene: boolean;
    print_net_client: boolean;
    print_net_server: boolean;
    show_tracker: boolean;
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

    config!: IConfig;

    constructor() {
        // Construct sub-modules
        this.Handle = new Hnd.BkOnline_Handlers(this);
        this.Client = new Hnd.BkOnline_Client(this);
        this.Server = new Hnd.BkOnline_Server(this);
    }

    preinit(): void { this.pMgr = new Puppet.PuppetManager(); }

    init(): void {
        // Init config
        this.config = this.ModLoader.config.registerConfigCategory('BkOnline') as IConfig;
        this.ModLoader.config.setData('BkOnline', 'play_as_puppet', 'true');
        this.ModLoader.config.setData('BkOnline', 'print_events_level', 'false');
        this.ModLoader.config.setData('BkOnline', 'print_events_scene', 'false');
        this.ModLoader.config.setData('BkOnline', 'print_net_client', 'false');
        this.ModLoader.config.setData('BkOnline', 'print_net_server', 'false');
        this.ModLoader.config.setData('BkOnline', 'show_tracker', 'true');
        this.ModLoader.config.setData('BkOnline', 'skip_intro', 'true');

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

        // Show tracker
        if (this.config.show_tracker) this.ModLoader.gui.openWindow(698, 795, __dirname + '/gui/Tracker.html');

        // Update discord
        let status: DiscordStatus = new DiscordStatus('Playing BkOnline', 'On the title screen [Team Select]');
        status.smallImageKey = 'bko';
        status.partyId = this.ModLoader.clientLobby;
        status.partyMax = 15;
        status.partySize = 1;
        this.ModLoader.gui.setDiscordStatus(status);
    }

    onTick(): void { this.Handle.tick(); }

    getServerURL(): string { return '158.69.60.101:8000'; }
}