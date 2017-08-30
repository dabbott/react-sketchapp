/* @flow */
import './globals';
import { render, renderToJSON } from './render';
import flexToSketchJSON from './flexToSketchJSON';
import Platform from './Platform';
import StyleSheet from './stylesheet';
import Artboard from './components/Artboard';
import Image from './components/Image';
import RedBox from './components/RedBox';
import View from './components/View';
import Text from './components/Text';
import TextStyles from './sharedStyles/TextStyles';
import { makeSymbol, injectSymbols, makeSymbolByName } from './symbol';

module.exports = {
  render,
  renderToJSON,
  flexToSketchJSON,
  StyleSheet,
  Artboard,
  Image,
  RedBox,
  Text,
  TextStyles,
  View,
  Platform,
  makeSymbol,
  injectSymbols,
  makeSymbolByName,
};
