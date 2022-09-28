import { NextApiRequest, NextApiResponse } from 'next/types';
import prisma from '../../../client';
import { withSentry } from '@sentry/nextjs';
import { findThreadById } from 'lib/threads';
import serializeThread from 'serializers/thread';
import { getAuthFromSession } from 'utilities/session';
import to from 'utilities/await-to-js';

async function update(request: NextApiRequest, response: NextApiResponse) {
  // TODO check user permissions
  const id = request.query.id as string;
  const { state } = JSON.parse(request.body);
  await prisma.threads.update({
    where: { id },
    data: { state },
  });
  return response.status(200).json({});
}

async function get(request: NextApiRequest, response: NextApiResponse) {
  const id = request.query.id as string;
  const [sessionErr, session] = await to(getAuthFromSession(request, response));
  if (!!sessionErr || !session) {
    return response.status(401).end();
  }
  const thread = await findThreadById(id);
  if (!thread) {
    return response.status(404).end();
  }
  const permission = session.tenants.find(
    (u) => u.accountId === thread.channel?.accountId
  );
  if (!permission) {
    return response.status(403).end();
  }
  return response.status(200).json(serializeThread(thread));
}

async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method === 'GET') {
    return get(request, response);
  }
  if (request.method === 'PUT') {
    return update(request, response);
  }
  return response.status(405).end();
}

export default withSentry(handler);
