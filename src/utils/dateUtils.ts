import dateFormat, { masks } from "dateformat";

export const formatDate = (date: string | number | Date, format = 'yyyy-mm-dd') =>
  date ? dateFormat(date, format) : '';

