import { cn, cls } from './cn';

export const classNames = (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(' ');

export { cn, cls };
