export interface FileUpload {
  filename: string;

  mimetype: string;

  encoding: string;

  createReadStream: Function;
}
