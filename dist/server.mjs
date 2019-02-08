"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Koa = require('koa');
const Router = require('koa-router');
const Send = require('koa-send');
const puppeteer = require('puppeteer');
const fs = require('fs');
const cors = require('koa2-cors');
var spawn = require('child_process').spawn;
const app = new Koa();
app.use(cors({ credentials: true }));
const router = new Router();
const playerjs = { url: 'https://clara.io/js/claraplayer.min.js' };
const snapshotExecutable = './src/takeSnapshot.ts';
//=====================================================================================================
//RegExp for input check
//=====================================================================================================
const numRegExp = /^[1-9]\d*$/;
//=====================================================================================================
//types
//=====================================================================================================
var supportedImageType;
(function (supportedImageType) {
    supportedImageType["png"] = "png";
    supportedImageType["jpg"] = "jpg";
    supportedImageType["gif"] = "gif";
})(supportedImageType = exports.supportedImageType || (exports.supportedImageType = {}));
//=====================================================================================================
//helpers
//=====================================================================================================
exports.parseDataUrl = (dataUrl) => {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (matches.length !== 3) {
        throw new Error('Could not parse data URL.');
    }
    return { mime: matches[1], buffer: Buffer.from(matches[2], 'base64') };
};
const getDataUrlThroughCanvas = async (attrs) => {
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
function getEnumValue(attrs) {
    if (!Object.values(supportedImageType).includes(attrs.type)) {
        return false;
    }
    return true;
}
function inputCheck(attrs) {
    if (attrs.width) {
        if (!attrs.width.match(numRegExp) ||
            attrs.width > 10000 ||
            attrs.width < 1) {
            throw {
                code: 400,
                msg: 'Width need to be number.',
            };
        }
    }
    if (attrs.height) {
        if (!attrs.height.match(numRegExp) ||
            attrs.height > 10000 ||
            attrs.height < 1) {
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
async function canvasScreenshot(attrs) {
    //page.setViewport({ width: width, height: height });
    try {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        const dataUrl = await page.evaluate(getDataUrlThroughCanvas, attrs);
        const { buffer } = exports.parseDataUrl(dataUrl);
        fs.writeFileSync('image.' + attrs.type, buffer, 'base64');
        await browser.close();
    }
    catch (error) {
        console.log(error);
    }
}
//=====================================================================================================
//clara screenshot
//=====================================================================================================
router.get('/image', async (ctx) => {
    try {
        const query = ctx.request.query;
        console.log(query);
        //input check
        inputCheck(query);
        ctx.body = ctx.request.query;
        ctx.type = 'image/' + query.type;
        let attrs = {
            width: query.width,
            height: query.height,
            color: query.color,
            type: query.type
                ? query.type
                : supportedImageType.png,
            url: query.url,
            uuid: query.uuid,
        };
        //const canvas = ctx.body.createElement('canvas');
        //puppeteer
        try {
            let claraScreenshot = spawn('node', [
                '--experimental-modules',
                snapshotExecutable,
                ctx,
                attrs,
            ]);
            claraScreenshot.stdout.on('data', function (data) {
                console.log('stdout: ', data.toString());
            });
            claraScreenshot.stderr.on('data', function (data) {
                console.log('stderr: ', data.toString());
            });
            claraScreenshot.on('message', function (msg) {
                console.log('stdout: ', msg.toString());
            });
            claraScreenshot.on('close', function (code) {
                console.log('close', code);
            });
            claraScreenshot.on('error', function (data) {
                console.log('stderr: ', data.toString());
            });
        }
        catch (err) {
            console.log(err);
        }
        //send image back
        //
    }
    catch (err) {
        if (err.code) {
            ctx.throw(err.code, {
                data: {
                    error: 'Unhandled error',
                    message: err.msg,
                },
            });
        }
        else {
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
router.get('/canvasTest', async (ctx) => {
    try {
        const query = ctx.request.query;
        //input check
        inputCheck(query);
        ctx.body = ctx.request.query;
        ctx.type = 'image/' + query.type;
        let attrs = {
            width: query.width,
            height: query.height,
            color: query.color,
            type: query.type
                ? query.type
                : supportedImageType.png,
        };
        //const canvas = ctx.body.createElement('canvas');
        //puppeteer
        try {
            await canvasScreenshot(attrs);
        }
        catch (err) {
            console.log(err);
        }
        //send image back
        await Send(ctx, './image.' + query.type);
    }
    catch (err) {
        if (err.code) {
            ctx.throw(err.code, {
                data: {
                    error: 'Unhandled error',
                    message: err.msg,
                },
            });
        }
        else {
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
//# sourceMappingURL=server.js.map