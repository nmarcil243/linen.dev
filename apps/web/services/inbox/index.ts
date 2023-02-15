import { GetServerSidePropsContext } from 'next';
import PermissionsService from 'services/permissions';
import CommunityService from 'services/community';
import CommunitiesService from 'services/communities';
import ChannelsService from 'services/channels';
import { serialize as serializeSettings } from 'serializers/account/settings';
import { NotFound, RedirectTo } from 'utilities/response';
import Session from 'services/session';
import serializeAccount from 'serializers/account';
import serializeChannel from 'serializers/channel';
import serializeUser from 'serializers/user';
import { qs } from '@linen/utilities/url';

export async function inboxGetServerSideProps(
  context: GetServerSidePropsContext,
  isSubDomainRouting: boolean
) {
  const permissions = await PermissionsService.for(context);
  if (!permissions.access) {
    return RedirectTo(
      `/signin?${qs({
        ...(permissions.auth?.id && { error: 'private' }),
        callbackUrl: context.req.url,
      })}`
    );
  }
  if (!permissions.inbox) {
    return RedirectTo(
      `/signin?${qs({
        ...(permissions.auth?.id && { error: 'private' }),
        callbackUrl: context.req.url,
      })}`
    );
  }
  const community = await CommunityService.find(context.params);
  if (!community) {
    return NotFound();
  }
  const channels = await ChannelsService.find(community.id);
  const currentUser = await Session.user(context.req, context.res);
  const communities = await CommunitiesService.find(context.req, context.res);

  const token = await Session.tokenRaw(context.req);

  return {
    props: {
      token: token || null,
      communityName: context?.params?.communityName,
      communityId: community.id,
      isSubDomainRouting,
      settings: serializeSettings(community),
      currentCommunity: serializeAccount(community),
      currentUser: currentUser && serializeUser(currentUser),
      communities: communities.map(serializeAccount),
      channels: channels.map(serializeChannel),
      permissions,
    },
  };
}