import { SerializedAccount } from '@linen/types';

export const openExternal = async (url: string) => {
  window.location.href = url;
};
export const listenDeepLink = async (callback: (...args: any) => any) => {};

export const callbackUrl = () => window.location.href;

export const getHomeUrl = (community: SerializedAccount) =>
  `${window.location.origin}/s/${
    community.slackDomain || community.discordDomain
  }`;