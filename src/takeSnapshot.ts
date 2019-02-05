const puppeteer = require('puppeteer');
const fs = require('fs');

import {
  claraScreenshotAttrs,
  supportedImageType,
  parseDataUrl,
} from './server';

interface Window {
  claraplayer: (id: string, attrs: any) => {};
  claraApi: any;
}

declare var window: Window;

export class snapshot {
  attrs: claraScreenshotAttrs;
  browser: any;
  page: any;
  api: any;

  constructor(attrs: claraScreenshotAttrs) {
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

    function describe(jsHandle: any) {
      return jsHandle.executionContext().evaluate((obj: any) => {
        if (typeof obj === 'object') {
          // https://stackoverflow.com/a/20405830/91365
          var plainObject: any = {};
          Object.getOwnPropertyNames(obj).forEach(function(key: any) {
            plainObject[key] = obj[key];
          });
          return JSON.stringify(plainObject);
        }

        return JSON.stringify(obj);
      }, jsHandle);
    }

    this.page.on('console', async (msg: any) => {
      let msgType = msg.type();
      msgType = msgType === 'warning' ? 'warn' : msgType;
      const args = await Promise.all(
        msg.args().map((arg: any) => describe(arg))
      );
      console.log(msg.text(), ...args);
    });

    const playerjs = { url: this.attrs.url };

    console.log(playerjs);
    const { height, width } = this.attrs;

    // 3. adjust div size to given parameters
    await this.page.setContent(
      `<body style="overflow: hidden; margin: 0;"><div id="clara-embed" style="width: ${width}px; height: ${height}px;"></div></body>`
    );

    // 2. add clara player script tag, wait for it to load
    await this.page.addScriptTag(playerjs);
  }

  // 4. initial clara player on main div
  async initializePlayer() {
    this.page.evaluate(function() {
      this.api = window.claraplayer('clara-embed', {
        makeErrorsFatal: true,
      });
    });
  }

  // 5. load scene specified and wait for it to finish loading
  async loadScene() {
    await this.page.evaluate(async function(attrs: claraScreenshotAttrs) {
      await this.api.initializePlayer(attrs.uuid, attrs);
      await this.api.waitFor('rendered');
    }, this.attrs);
  }

  // 6. do a snapshot and return the data.
  async snapshot(format?: supportedImageType) {
    const dataUrl = await this.page.evaluate(
      async (format: supportedImageType) => {
        await this.api.commands.setCommandOptions('snapshot', {
          dataType: 'dataURL',
          format: format || 'png',
        });
        return await this.api.commands.runCommand('snapshot');
      },
      format
    );
    const buffer = new Buffer(dataUrl.split(',')[1], 'base64');

    //const { buffer } = parseDataUrl(dataUrl);
    fs.writeFileSync('image.' + this.attrs.type, buffer);
    await this.browser.close();
  }
}
