import * as AWS from "aws-sdk";
import { FileUpload } from "../dtos/file.upload";
import fs from "fs";

interface RemoveResult {
  ok: boolean;
  error?: string;
}

interface UploadResult extends RemoveResult {
  url?: string;
}

const BUCKET_NAME = "ninstaclone";

// FileUpload from dto/file.upload.ts
export const uploadFile = async (file: FileUpload): Promise<UploadResult> => {
  try {
    // credential config.
    if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY) {
      AWS.config.update({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_KEY,
        },
      });

      // s3-upload-stream package, WriteStream for S3
      const s3Stream = require("s3-upload-stream")(new AWS.S3());

      const { filename, createReadStream } = file;

      const readStream: fs.ReadStream = createReadStream();

      const objectName = `${Date.now()}_${filename}`;
      /* s3-upload-stream을 사용하지 않고서는 AWS.S3.upload({
        ...,
        Body: readStream
      })
      이렇게 해도 되는 모양이다. 
      https://nomadcoders.co/instaclone/lectures/2463 6:33
      */
      const upload = s3Stream.upload({
        Bucket: BUCKET_NAME,
        Key: objectName,
        ACL: "public-read",
      });

      readStream.pipe(upload);

      // handle events for s3-upload-stream
      const end = new Promise<string | null>((resolve, reject) => {
        upload.on("error", () => {
          reject("Error occured on file uploading");
        });

        upload.on("uploaded", (details) => {
          resolve(details.Location);
        });
      });
      const url = await end;
      return {
        ok: true,
        ...(url && { url }),
      };
    } else {
      throw new Error("AWS Credential failed");
    }
  } catch (e) {
    return {
      ok: false,
      error: e.message,
    };
  }
};

/*url: RegExp['$&'],

protocol:RegExp.$2,

host:RegExp.$3,

path:RegExp.$4,

file:RegExp.$6,

query:RegExp.$7,

hash:RegExp.$8*/
// from: https://stackoverflow.com/questions/27745/getting-parts-of-a-url-regex
const urlRegex = /^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/g;

export const removeFile = async (url: string) => {
  try {
    if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY) {
      AWS.config.update({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_KEY,
        },
      });
      if (url.includes(BUCKET_NAME)) {
        const parsed = url.split(urlRegex);
        // look up above comment on defining urlRegex.
        const key = parsed[4] + parsed[6];

        const result = await new AWS.S3()
          .deleteObject({
            Bucket: BUCKET_NAME,
            Key: key,
          })
          .promise();

        return {
          ok: true,
        };
      } else {
        // return ok, even if it's not on S3 BUCKET
        return {
          ok: true,
        };
      }
    } else {
      throw new Error("AWS credential failed");
    }
  } catch (e) {
    return {
      ok: false,
      error: e.message,
    };
  }
};
