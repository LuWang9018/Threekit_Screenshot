"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = require('puppeteer');
const fs = require('fs');
const Send = require('koa-send');
class snapshot {
    constructor(attrs) {
        this.attrs = attrs;
    }
    // 1. load template html page snapshot-template.html
    async loadTemplatePage() {
        console.log('>>>>>>>>>>>>>>');
        this.browser = await puppeteer.launch({
            headless: false,
            args: [
                '--hide-scrollbars',
                '--mute-audio',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
            ],
        });
        console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@');
        this.page = await this.browser.newPage();
        function describe(jsHandle) {
            return jsHandle.executionContext().evaluate((obj) => {
                if (typeof obj === 'object') {
                    // https://stackoverflow.com/a/20405830/91365
                    var plainObject = {};
                    Object.getOwnPropertyNames(obj).forEach(function (key) {
                        plainObject[key] = obj[key];
                    });
                    return JSON.stringify(plainObject);
                }
                return JSON.stringify(obj);
            }, jsHandle);
        }
        this.page.on('console', async (msg) => {
            let msgType = msg.type();
            msgType = msgType === 'warning' ? 'warn' : msgType;
            const args = await Promise.all(msg.args().map((arg) => describe(arg)));
            console.log(msg.text(), ...args);
        });
        const playerjs = { url: this.attrs.url };
        console.log(playerjs);
        const { height, width } = this.attrs;
        // 3. adjust div size to given parameters
        await this.page.setContent(`<body style="overflow: hidden; margin: 0;"><div id="clara-embed" style="width: ${width}px; height: ${height}px;"></div></body>`);
        // 2. add clara player script tag, wait for it to load
        await this.page.addScriptTag(playerjs);
    }
    // 4. initial clara player on main div
    async initializePlayer() {
        this.page.evaluate(function () {
            this.api = window.claraplayer('clara-embed', {
                makeErrorsFatal: true,
            });
        });
    }
    // 5. load scene specified and wait for it to finish loading
    async loadScene() {
        await this.page.evaluate(async function (attrs) {
            await this.api.initializePlayer(attrs.uuid, attrs);
            await this.api.waitFor('rendered');
        }, this.attrs);
    }
    // 6. do a snapshot and return the data.
    async snapshot(format) {
        const dataUrl = await this.page.evaluate(async (format) => {
            await this.api.commands.setCommandOptions('snapshot', {
                dataType: 'dataURL',
                format: format || 'png',
            });
            return await this.api.commands.runCommand('snapshot');
        }, format);
        const buffer = new Buffer(dataUrl.split(',')[1], 'base64');
        //const { buffer } = parseDataUrl(dataUrl);
        fs.writeFileSync('image.' + this.attrs.type, buffer);
        await this.browser.close();
    }
}
exports.snapshot = snapshot;
async function takeSnapshot(ctx, attrs) {
    const snapshotIns = new snapshot(attrs);
    console.log('Snapshot instance created');
    await snapshotIns.loadTemplatePage();
    console.log('Template page loaded');
    await snapshotIns.initializePlayer();
    console.log('Player initialized');
    await snapshotIns.loadScene();
    console.log('Scene loaded');
    await snapshotIns.snapshot();
    console.log('Snapshot taken');
    await Send(ctx, './image.' + ctx.type);
}
takeSnapshot(process.argv[2], process.argv[3]);
//# sourceMappingURL=takeSnapshot.js.map