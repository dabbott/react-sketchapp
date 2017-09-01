/* @flow */
// We need native macOS fonts and colors for these hacks so import the old utils
import type { SJTextStyle } from 'sketchapp-json-flow-types';
import { TextAlignment } from 'sketch-constants';
import { toSJSON } from 'sketchapp-json-plugin';
import $ from 'nodobjc';
import findFont from '../utils/findFont';
import type { TextStyle } from '../types';
import { generateID, makeColorFromCSS } from './models';

$.framework('Foundation');
$.framework('AppKit');

export const TEXT_ALIGN = {
  auto: TextAlignment.Left,
  left: TextAlignment.Left,
  right: TextAlignment.Right,
  center: TextAlignment.Center,
  justify: TextAlignment.Justified,
};

export const TEXT_DECORATION_UNDERLINE = {
  none: 0,
  underline: 1,
  double: 9,
};

export const TEXT_DECORATION_LINETHROUGH = {
  none: 0,
  'line-through': 1,
};

// this doesn't exist in constants
export const TEXT_TRANSFORM = {
  uppercase: 1,
  lowercase: 2,
  initial: 0,
  inherit: 0,
  none: 0,
  capitalize: 0,
};

// NOTE(gold): toSJSON doesn't recursively parse JS objects
// https://github.com/airbnb/react-sketchapp/pull/73#discussion_r108529703
function encodeSketchJSON(sketchObj) {
  const encoded = toSJSON(sketchObj);
  return JSON.parse(encoded);
}

function makeParagraphStyle(textStyle) {
  const pStyle = NSMutableParagraphStyle.alloc().init();
  if (textStyle.lineHeight !== undefined) {
    pStyle.minimumLineHeight = textStyle.lineHeight;
    pStyle.maximumLineHeight = textStyle.lineHeight;
  }

  if (textStyle.textAlign) {
    pStyle.alignment = TEXT_ALIGN[textStyle.textAlign];
  }

  return pStyle;
}

export const makeImageDataFromUrl = (url: string): MSImageData => {
  let fetchedData = NSData.dataWithContentsOfURL(NSURL.URLWithString(url));

  if (fetchedData) {
    const firstByte = fetchedData
      .subdataWithRange(NSMakeRange(0, 1))
      .description();

    // Check for first byte. Must use non-type-exact matching (!=).
    // 0xFF = JPEG, 0x89 = PNG, 0x47 = GIF, 0x49 = TIFF, 0x4D = TIFF
    if (
      /* eslint-disable eqeqeq */
      firstByte != '<ff>' &&
      firstByte != '<89>' &&
      firstByte != '<47>' &&
      firstByte != '<49>' &&
      firstByte != '<4d>'
      /* eslint-enable eqeqeq */
    ) {
      fetchedData = null;
    }
  }

  let image;

  if (!fetchedData) {
    const errorUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mM8w8DwHwAEOQHNmnaaOAAAAABJRU5ErkJggg==';
    image = NSImage.alloc().initWithContentsOfURL(
      NSURL.URLWithString(errorUrl)
    );
  } else {
    image = NSImage.alloc().initWithData(fetchedData);
  }

  return MSImageData.alloc().initWithImage_convertColorSpace(image, false);
};

// This shouldn't need to call into Sketch, but it does currently, which is bad for perf :(
export function makeAttributedString(string: ?string, textStyle: TextStyle) {
  // const font = findFont(textStyle);

  const color = makeColorFromCSS(textStyle.color || 'black');

  // const attribs: Object = {
  //   MSAttributedStringFontAttribute: font.fontDescriptor(),
  //   NSParagraphStyle: makeParagraphStyle(textStyle),
  //   NSColor: NSColor.colorWithDeviceRed_green_blue_alpha(
  //     color.red,
  //     color.green,
  //     color.blue,
  //     color.alpha
  //   ),
  //   NSUnderline: TEXT_DECORATION_UNDERLINE[textStyle.textDecoration] || 0,
  //   NSStrikethrough: TEXT_DECORATION_LINETHROUGH[textStyle.textDecoration] || 0,
  // };

  // if (textStyle.letterSpacing !== undefined) {
  //   attribs.NSKern = textStyle.letterSpacing;
  // }

  // if (textStyle.textTransform !== undefined) {
  //   attribs.MSAttributedStringTextTransformAttribute =
  //     TEXT_TRANSFORM[textStyle.textTransform] * 1;
  // }

  const NSFontAttributeName = $.NSString('stringWithUTF8String', 'NSFont');
  const NSForegroundColorAttributeName = $.NSString(
    'stringWithUTF8String',
    'NSColor'
  );
  const attributes = $.NSMutableDictionary('alloc')('init');

  const fontSize = textStyle.fontSize || 12.0;

  const getFont = (fontFamily) => {
    if (fontFamily) {
      const lookup = $.NSFont('fontWithName', $(fontFamily), 'size', fontSize);

      if (lookup) return lookup;
    }

    return $.NSFont('systemFontOfSize', fontSize);
  };

  const font = getFont(textStyle.fontFamily);
  const nsColor = $.NSColor(
    'colorWithDeviceRed',
    color.red,
    'green',
    color.green,
    'blue',
    color.blue,
    'alpha',
    color.alpha
  );
  attributes('setValue', font, 'forKey', NSFontAttributeName);
  attributes('setValue', nsColor, 'forKey', NSForegroundColorAttributeName);

  const nsString = $.NSString('stringWithUTF8String', string);

  const attribStr = $.NSAttributedString('alloc')(
    'initWithString',
    nsString,
    'attributes',
    attributes
  );

  const archive = $.NSKeyedArchiver('archivedDataWithRootObject', attribStr)(
    'base64Encoding'
  );

  const msAttribStr = {
    _class: 'MSAttributedString',
    archivedAttributedString: {
      _archive: archive('UTF8String'),
    },
  };

  console.log('msAttrib', font);

  return msAttribStr;

  // const attribStr = NSAttributedString.attributedStringWithString_attributes_(
  //   string,
  //   attribs
  // );
  // const msAttribStr = MSAttributedString.alloc().initWithAttributedString(
  //   attribStr
  // );

  // return encodeSketchJSON(msAttribStr);
}

export function makeTextStyle(textStyle: TextStyle) {
  const pStyle = makeParagraphStyle(textStyle);

  const font = findFont(textStyle);

  const color = makeColorFromCSS(textStyle.color || 'black');

  const value: SJTextStyle = {
    _class: 'textStyle',
    encodedAttributes: {
      MSAttributedStringFontAttribute: encodeSketchJSON(font.fontDescriptor()),
      NSColor: encodeSketchJSON(
        NSColor.colorWithDeviceRed_green_blue_alpha(
          color.red,
          color.green,
          color.blue,
          color.alpha
        )
      ),
      NSParagraphStyle: encodeSketchJSON(pStyle),
      NSKern: textStyle.letterSpacing || 0,
      MSAttributedStringTextTransformAttribute:
        TEXT_TRANSFORM[textStyle.textTransform || 'initial'] * 1,
    },
  };

  return {
    _class: 'style',
    sharedObjectID: generateID(),
    miterLimit: 10,
    startDecorationType: 0,
    endDecorationType: 0,
    textStyle: value,
  };
}
