import {
  screenshotAttrs,
  claraScreenshotAttrs,
  supportedImageType,
} from './server';

//=====================================================================================================
//RegExp for input check
//=====================================================================================================
const numRegExp = /^[1-9]\d*$/;

export interface inputCheckResult {
  code: number;
  msg: string;
}

function getEnumValue(attrs: screenshotAttrs | claraScreenshotAttrs) {
  if (!Object.values(supportedImageType).includes(attrs.type)) {
    return false;
  }

  return true;
}

export function inputCheck(attrs: any): inputCheckResult {
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

export function parseQuery(query: any) {
  inputCheck(query);

  let attrs: claraScreenshotAttrs = {
    width: <number>query.width,
    height: <number>query.height,
    color: <string>query.color,
    type: query.type ? <supportedImageType>query.type : supportedImageType.png,
    url: query.url,
    uuid: query.uuid,
  };

  if (query.configuration) {
    attrs.configuration = JSON.parse(query.configuration);
  }
  // console.log('query confs:');
  // console.log(query.confs);

  // let queryObject = JSON.parse(query.confs);
  // for (let key in queryObject) {
  //   //console.log('key:', key, ' contants: ', queryObject[key]);
  //   let confs = queryObject;
  //   if (confs.hasOwnProperty(key)) {
  //     attrs[key] = confs[key];
  //   }
  // }

  return attrs;
}
