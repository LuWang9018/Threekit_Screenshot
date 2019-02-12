import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as Send from 'koa-send';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as cors from 'koa2-cors';
import { spawn } from 'child_process';
import * as os from 'os';
import * as uuidV4 from 'uuid/v4';

import { inputCheck, parseQuery } from './parsequery';

const app = new Koa();
app.use(cors({ credentials: true }));
const router = new Router();
const playerjs = { url: 'https://clara.io/js/claraplayer.min.js' };
const snapshotExecutable = './src/takeSnapshot.ts';
const tmpdir = os.tmpdir().toString();

//=====================================================================================================
//types
//=====================================================================================================
export enum supportedImageType {
  png = 'png',
  jpg = 'jpg',
  gif = 'gif',
}

export interface screenshotAttrs extends puppeteer.JSONObject {
  width: number;
  height: number;
  color: string;
  type: supportedImageType;
}

export interface claraScreenshotAttrs extends puppeteer.JSONObject {
  url: string;
  uuid: string;
  width: number;
  height: number;
  color?: string;
  type: supportedImageType;
  configuration?: any;
}
//=====================================================================================================
//helpers
//=====================================================================================================
export const parseDataUrl = (dataUrl: string) => {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (matches.length !== 3) {
    throw new Error('Could not parse data URL.');
  }
  return { mime: matches[1], buffer: Buffer.from(matches[2], 'base64') };
};

const getDataUrlThroughCanvas = async (attrs: screenshotAttrs) => {
  // Create a canvas and context to draw onto.
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = attrs.width;
  canvas.height = attrs.height;

  ctx.beginPath();
  ctx.rect(0, 0, attrs.width, attrs.height);
  ctx.fillStyle = attrs.color;
  ctx.fill();

  return canvas.toDataURL();
};

async function canvasScreenshot(attrs: screenshotAttrs) {
  //page.setViewport({ width: width, height: height });

  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const dataUrl: any = await page.evaluate(getDataUrlThroughCanvas, attrs);
    const { buffer } = parseDataUrl(dataUrl);
    fs.writeFileSync('image.' + attrs.type, buffer, 'base64');
    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

//=====================================================================================================
//clara screenshot
//=====================================================================================================
router.get('/image', async (ctx: any) => {
  try {
    const query = ctx.request.query;

    console.log('query contents');
    console.log(query);

    let attrs = parseQuery(query);
    console.log('parced query');
    console.log(attrs);

    const imageName: string = uuidV4();
    const filePath: string = tmpdir + '/' + imageName + '.' + query.type;
    //puppeteer

    // console.log('attrs: ', attrs);
    console.log('filePath: ', filePath);

    try {
      var env = {
        NODE_VERSION: process.env.NODE_VERSION,
        DISPLAY: process.env.DISPLAY,
        XAUTHORITY: process.env.XAUTHORITY,
        PATH: process.env.PATH,
      };

      console.log(process.env.DISPLAY);
      let claraScreenshot = spawn(
        'ts-node',
        [snapshotExecutable, JSON.stringify(attrs), '"' + filePath + '"'],
        { env }
      );

      claraScreenshot.stdout.on('data', function(data: any) {
        console.log('stdout: ', data.toString());
      });

      claraScreenshot.stderr.on('data', function(data: any) {
        console.log('stderr: ', data.toString());
      });

      claraScreenshot.on('error', function(data: any) {
        console.log('stderr: ', data.toString());
      });

      let finishEvent = new Promise(resolve => {
        claraScreenshot.on('close', async function(code: any) {
          console.log('query.type', query.type);

          await Send(ctx, filePath, { root: '/' });
          fs.unlinkSync(filePath);
          console.log('close', code);
          resolve();
        });
      });

      await finishEvent;
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    if (err.code) {
      ctx.throw(err.code, {
        data: {
          error: 'Unhandled error',
          message: err.msg,
        },
      });
    } else {
      ctx.throw(500, {
        data: {
          error: 'Unhandled error',
          message: err,
        },
      });
    }
  }
});

//=====================================================================================================
//canvasTest
//=====================================================================================================
router.get('/canvasTest', async (ctx: any) => {
  try {
    const query = ctx.request.query;

    //input check
    inputCheck(query);

    ctx.body = ctx.request.query;
    ctx.type = 'image/' + query.type;
    let attrs: screenshotAttrs = {
      width: <number>query.width,
      height: <number>query.height,
      color: <string>query.color,
      type: query.type
        ? <supportedImageType>query.type
        : supportedImageType.png,
    };

    //const canvas = ctx.body.createElement('canvas');

    //puppeteer
    try {
      await canvasScreenshot(attrs);
    } catch (err) {
      console.log(err);
    }

    //send image back
    await Send(ctx, './image.' + query.type);
  } catch (err) {
    if (err.code) {
      ctx.throw(err.code, {
        data: {
          error: 'Unhandled error',
          message: err.msg,
        },
      });
    } else {
      ctx.throw(500, {
        data: {
          error: 'Unhandled error',
          message: err,
        },
      });
    }
  }
});

app.use(router.routes());

app.listen(3000);

console.log('Server running on port 3000');
