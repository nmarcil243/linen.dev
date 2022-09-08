import { uploadFile } from 'services/aws/s3';
import {
  BUCKET_PREFIX_FOR_ATTACHMENTS,
  LINEN_ASSETS_CDN,
} from '../../../constants';
import { messages } from '@prisma/client';
import {
  type ConversationHistoryMessage,
  fetchFile,
  type MessageFile,
} from '../api';
import prisma from '../../../client';
import { captureExceptionAndFlush } from 'utilities/sentry';

export async function processAttachments(
  m: ConversationHistoryMessage,
  message: messages,
  token: string
) {
  const promises = [];

  let files: Record<string, string>;
  if (m.files) {
    files = await processLinks(m.files, token);
  }

  if (m.files && m.files.length) {
    promises.push(
      ...m.files
        .filter((file) => !!file.name)
        .map((file) => {
          const serializedFile = {
            messagesId: message.id,
            externalId: file.id,
            name: file.name,
            sourceUrl: file.url_private,
            internalUrl: files[file.id],
            mimetype: file.mimetype,
            permalink: file.permalink,
            title: file.title,
          };
          return prisma.messageAttachments
            .upsert({
              where: {
                messagesId_externalId: {
                  externalId: file.id,
                  messagesId: message.id,
                },
              },
              create: serializedFile,
              update: serializedFile,
            })
            .catch((error) => {
              console.log('attachment failure', error);
              return captureExceptionAndFlush(error);
            });
        })
    );
  }
  return await Promise.all(promises).catch(captureExceptionAndFlush);
}

/**
 * this function will upload files to s3 and return the fileId and internalUrl (cdn or s3 url)
 * of each as attributes of a key-value object
 * @param files
 * @param token
 * @returns Object { [key]: value, [fileId]: internalUrl }
 */
async function processLinks(
  files: MessageFile[],
  token: string
): Promise<Record<string, string>> {
  if (!files || !files.length) return {};

  async function processLink(file: MessageFile) {
    if (!file.url_private) return {};
    try {
      const response = await fetchFile(file.url_private, token);
      const s3Key = [
        BUCKET_PREFIX_FOR_ATTACHMENTS,
        file.id,
        file.name || 'unknown',
      ].join('/');
      await uploadFile(s3Key, Buffer.from(response.text || response.body));
      return {
        fileId: file.id,
        internalUrl: [LINEN_ASSETS_CDN, s3Key].join('/'),
      };
    } catch (error) {
      console.error(error);
      await captureExceptionAndFlush(error);
      return {};
    }
  }

  return (await Promise.all(files.map(processLink))).reduce(arrayToMap, {});
}

function arrayToMapGeneric(key: string, val: string) {
  return (prev: any, curr: any) => {
    return {
      ...prev,
      [curr[key]]: curr[val],
    };
  };
}

const arrayToMap = arrayToMapGeneric('fileId', 'internalUrl');