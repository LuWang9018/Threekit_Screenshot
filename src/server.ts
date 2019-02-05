const Koa = require('koa');
const Router = require('koa-router');
const Send = require('koa-send');
const puppeteer = require('puppeteer');
const fs = require('fs');
const cors = require('koa2-cors');

import { snapshot } from './takeSnapshot';

const app = new Koa();
app.use(cors({ credentials: true }));
const router = new Router();
const playerjs = { url: 'https://clara.io/js/claraplayer.min.js' };

//=====================================================================================================
//RegExp for input check
//=====================================================================================================
const numRegExp = /^[1-9]\d*$/;

//=====================================================================================================
//types
//=====================================================================================================
export enum supportedImageType {
  png = 'png',
  jpg = 'jpg',
  gif = 'gif',
}

export interface screenshotAttrs {
  width: number;
  height: number;
  color: string;
  type: supportedImageType;
}

export interface inputCheckResult {
  code: number;
  msg: string;
}

export interface claraScreenshotAttrs {
  url: string;
  uuid: string;
  width: number;
  height: number;
  color: string;
  type: supportedImageType;
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

function getEnumValue(attrs: screenshotAttrs) {
  if (!Object.values(supportedImageType).includes(attrs.type)) {
    return false;
  }

  return true;
}

function inputCheck(attrs: any): inputCheckResult {
  if (attrs.width) {
    if (
      !attrs.width.match(numRegExp) ||
      <number>attrs.width > 10000 ||
      <number>attrs.width < 1
    ) {
      throw {
        code: 400,
        msg: 'Width need to be number.',
      };
    }
  }

  if (attrs.height) {
    if (
      !attrs.height.match(numRegExp) ||
      <number>attrs.height > 10000 ||
      <number>attrs.height < 1
    ) {
      throw {
        code: 400,
        msg: 'Height need to be number.',
      };
    }
  }

  //TODO
  //check color

  //check image type
  if (!getEnumValue(attrs)) {
    throw {
      code: 400,
      msg: 'Given type does not support.',
    };
  }
  return {
    code: 1,
    msg: 'success',
  };
}

async function screenshot(attrs: screenshotAttrs) {
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
    console.log(query);
    //input check
    inputCheck(query);

    ctx.body = ctx.request.query;
    ctx.type = 'image/' + query.type;
    let attrs: claraScreenshotAttrs = {
      width: <number>query.width,
      height: <number>query.height,
      color: <string>query.color,
      type: query.type
        ? <supportedImageType>query.type
        : supportedImageType.png,
      url: query.url,
      uuid: query.uuid,
    };

    //const canvas = ctx.body.createElement('canvas');

    //puppeteer
    try {
      const snapshotIns: snapshot = new snapshot(attrs);
      console.log('111111111111');
      await snapshotIns.loadTemplatePage();
      console.log('22222222222222');
      await snapshotIns.initializePlayer();
      await snapshotIns.loadScene();
      console.log('333333333333333333');
      await snapshotIns.snapshot();
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
      await screenshot(attrs);
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
