export type ActionDataGen<T> = {
  formError?: string;
  fieldErrors?: {
    [key in keyof T]: string | undefined;
  };
  fields?: {
    [key in keyof T]: string;
  };
};