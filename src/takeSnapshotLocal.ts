import * as fs from 'fs';
import { spawn } from 'child_process';

const snapshotExecutable = './src/takeSnapshot.ts';

async function screenshotLocal(attrs: any) {
  try {
    console.log(attrs);

    const imageName: string = 'image';
    const filePath: string = './' + imageName + '.' + attrs.type;
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
          console.log('query.type', attrs.type);

          console.log('close', code);
          resolve();
        });
      });

      await finishEvent;
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
}

async function screenshotReadFile(path: string) {
  let attrs: any = JSON.parse(fs.readFileSync(path, 'utf8'));

  console.log('attrs', attrs);
  console.log('type: ', typeof attrs.url);
  await screenshotLocal(attrs);
}

screenshotReadFile(process.argv[2]);
