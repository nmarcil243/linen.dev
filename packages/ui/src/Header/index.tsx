import React from 'react';
import { addHttpsToUrl } from '@linen/utilities/url';
import { pickTextColorBasedOnBgColor } from '@linen/utilities/colors';
import type {
  Permissions,
  SerializedAccount,
  SerializedChannel,
  SerializedSearchMessage,
  Settings,
} from '@linen/types';
import UserAvatar from './UserAvatar';
import styles from './index.module.scss';
import MobileMenu from './MobileMenu';
import Logo from './Logo';
import UpgradeButton from './UpgradeButton';
import type { ApiClient } from '@linen/api-client';
import SearchBar from '@/SearchBar';

interface Props {
  settings: Settings;
  channels: SerializedChannel[];
  channelName?: string;
  currentCommunity: SerializedAccount;
  permissions: Permissions;
  // dep injection
  JoinButton: (args: any) => JSX.Element;
  Link: any;
  InternalLink: (args: any) => JSX.Element;
  routerAsPath: string;
  signOut: () => void;
  usePath: (args: { href: string }) => string;
  api: ApiClient;
  handleSelect: (message: SerializedSearchMessage) => void;
}

function isWhiteColor(color: string) {
  return ['white', '#fff', '#ffffff'].includes(color.toLowerCase());
}

export default function Header({
  settings,
  channels,
  channelName,
  currentCommunity,
  permissions,
  JoinButton,
  Link,
  InternalLink,
  routerAsPath,
  signOut,
  usePath,
  api,
  handleSelect,
}: Props) {
  const brandColor = currentCommunity.brandColor || 'var(--color-navbar)';
  const fontColor = pickTextColorBasedOnBgColor(brandColor, 'white', 'black');
  const homeUrl = addHttpsToUrl(settings.homeUrl);
  const logoUrl = addHttpsToUrl(settings.logoUrl);
  const borderColor = isWhiteColor(brandColor) ? '#e5e7eb' : brandColor;
  return (
    <div
      className={styles.container}
      style={{
        backgroundColor: brandColor,
        borderBottom: `1px solid ${borderColor}`,
        borderTop: `1px solid ${brandColor}`,
      }}
    >
      <Link
        className={styles.logo}
        href={homeUrl || '/'}
        passHref
        target="_blank"
      >
        <Logo src={logoUrl} alt={`${homeUrl} logo`} />
      </Link>
      <SearchBar
        className={styles.search}
        brandColor={brandColor}
        channels={channels}
        accountId={settings.communityId}
        api={api}
        handleSelect={handleSelect}
      />
      <div className={styles.menu}>
        {permissions.user && permissions.is_member ? (
          <>
            <div className={styles.upgrade}>
              {!currentCommunity.premium && permissions.manage && (
                <UpgradeButton InternalLink={InternalLink} />
              )}
              <UserAvatar
                currentUser={permissions.user}
                signOut={signOut}
                api={api}
              />
            </div>
            <div className={styles.lgHidden}>
              <MobileMenu
                channelName={channelName}
                fontColor={fontColor}
                channels={channels}
                permissions={permissions}
                InternalLink={InternalLink}
                routerAsPath={routerAsPath}
                signOut={signOut}
                usePath={usePath}
              />
            </div>
          </>
        ) : (
          <>
            <JoinButton
              brandColor={brandColor}
              fontColor={fontColor}
              currentCommunity={currentCommunity}
              settings={settings}
            />
            <div className={styles.lgHidden}>
              <MobileMenu
                channelName={channelName}
                fontColor={fontColor}
                channels={channels}
                permissions={permissions}
                InternalLink={InternalLink}
                routerAsPath={routerAsPath}
                signOut={signOut}
                usePath={usePath}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}