import { unstable_composeUploadHandlers, unstable_createFileUploadHandler, unstable_createMemoryUploadHandler } from "@remix-run/node";

export const uploadHandlerFun = (directory: string, fileName: string, maxPartSize: number = 5_000_000) => unstable_composeUploadHandlers(
  unstable_createFileUploadHandler({
    avoidFileConflicts: false,
    maxPartSize,
    directory,
    file: (f) =>
      `${fileName}.${f.contentType.split('/').pop()}`
    ,
  }),
  // parse everything else into memory
  unstable_createMemoryUploadHandler()
);