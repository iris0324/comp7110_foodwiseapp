import en from './en.js?v=13.0';
import zh from './zh.js?v=13.0';
let language='en';
export const setLanguage=value=>language=value;
export const getLanguage=()=>language;
export const t=key=>(language==='zh'?zh:en)[key]??en[key]??key;
export const dateText=value=>value?new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en-AU',{dateStyle:'medium'}).format(new Date(value+'T12:00:00')):t('unknownDate');
export const timeText=value=>new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en-AU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
