import { useState, useRef, useCallback } from 'react';
import { Layouts, Pages, Toast } from '@linen/ui';
import Thread from 'components/Thread';
import AddThreadModal from './AddThreadModal';
import Empty from './Empty';
import { sendMessageWrapper } from './utilities/sendMessageWrapper';
import { createThreadWrapper } from './utilities/createThreadWrapper';
import usePolling from '@linen/hooks/polling';
import useKeyboard from '@linen/hooks/keyboard';
import { useUsersContext } from '@linen/contexts/Users';
import useInboxWebsockets from '@linen/hooks/websockets/inbox';
import type { CommunityPushType } from 'services/push';
import { manageSelections } from './utilities/selection';
import {
  SerializedChannel,
  SerializedMessage,
  SerializedThread,
  Settings,
  ThreadState,
  Permissions,
  SerializedAccount,
} from '@linen/types';
import { addMessageToThread, prependThread } from './state';

const { Header, Grid } = Pages.Inbox;
const { SidebarLayout } = Layouts.Shared;

interface InboxResponse {
  threads: SerializedThread[];
  total: number;
}

interface Selections {
  [key: string]: {
    checked: boolean;
    index: number;
  };
}

interface Props {
  fetchInbox({
    communityName,
    page,
    limit,
  }: {
    communityName: string;
    page: number;
    limit: number;
  }): Promise<InboxResponse>;
  fetchThread(threadId: string): Promise<SerializedThread>;
  putThread(
    threadId: string,
    options: {
      state?: ThreadState | undefined;
      title?: string | undefined;
    }
  ): Promise<SerializedThread>;
  fetchTotal({
    communityName,
  }: {
    communityName: string;
  }): Promise<InboxResponse>;
  channels: SerializedChannel[];
  currentCommunity: SerializedAccount;
  isSubDomainRouting: boolean;
  permissions: Permissions;
  settings: Settings;
}

const LIMIT = 10;

enum ModalView {
  ADD_THREAD,
}

export default function Inbox({
  fetchInbox,
  fetchThread,
  putThread,
  fetchTotal,
  channels,
  currentCommunity,
  isSubDomainRouting,
  permissions,
  settings,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState<InboxResponse>({ threads: [], total: 0 });
  const [page, setPage] = useState<number>(1);
  const [modal, setModal] = useState<ModalView>();
  const [key, setKey] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [thread, setThread] = useState<SerializedThread>();
  const ref = useRef<HTMLDivElement>(null);
  const [allUsers] = useUsersContext();
  const { isShiftPressed } = useKeyboard();

  const token = permissions.token || null;
  const currentUser = permissions.user || null;
  const { communityId, communityName } = settings;

  const onNewMessage = useCallback(
    (payload: CommunityPushType) => {
      const thread: SerializedThread =
        payload.thread && JSON.parse(payload.thread);
      const message: SerializedMessage =
        payload.message && JSON.parse(payload.message);
      if (page > 1) {
        return;
      }
      if (thread) {
        setInbox(prependThread(thread));
      }
      if (message) {
        const thread = inbox.threads.find((t) => t.id === message.threadId);
        if (thread) {
          setInbox(prependThread(thread, message));
        } else {
          fetchThread(payload.thread_id).then((thread) =>
            setInbox(prependThread(thread, message))
          );
        }
      }
    },
    [currentUser?.id]
  );

  const onThreadMessage = (
    message: SerializedMessage,
    messageId: string,
    imitationId: string
  ) => {
    setThread((thread) =>
      addMessageToThread(thread, message, messageId, imitationId)
    );
  };

  useInboxWebsockets({
    communityId,
    onNewMessage,
    permissions,
    token,
  });

  const [polling] = usePolling(
    {
      fetch(): any {
        return fetchInbox({ communityName, page, limit: LIMIT });
      },
      success(data: InboxResponse) {
        setLoading(false);
        setInbox((inbox) => ({ ...inbox, threads: data.threads }));
        setThread(data.threads[0]);
      },
      error() {
        Toast.error('Something went wrong. Please reload the page.');
      },
    },
    [communityName, page, key]
  );

  const [totalPolling] = usePolling(
    {
      fetch(): any {
        return fetchTotal({ communityName });
      },
      success(data: InboxResponse) {
        setInbox((inbox) => ({ ...inbox, total: data.total }));
      },
      error() {},
    },
    [communityName, key]
  );

  const updateThread = ({
    state,
    title,
  }: {
    state?: ThreadState;
    title?: string;
  }) => {
    if (!thread) {
      return;
    }
    const options: { state?: ThreadState; title?: string } = {};

    if (state) {
      options.state = state;
    }

    if (title) {
      options.title = title;
    }

    setThread((thread) => {
      if (!thread) {
        return;
      }
      return {
        ...thread,
        ...options,
      };
    });

    setInbox((inbox) => {
      return {
        ...inbox,
        threads: inbox.threads.map((inboxThread) => {
          if (inboxThread.id === thread.id) {
            return {
              ...inboxThread,
              ...options,
            };
          }
          return inboxThread;
        }),
      };
    });

    return putThread(thread.id, options)
      .then((_) => {
        if (options.state) {
          setKey((key) => key + 1);
        }
        return;
      })
      .catch((_: Error) => {
        Toast.error('Failed to close the thread.');
      });
  };

  function onMarkAllAsRead() {
    setThread(undefined);
    const { threads } = inbox;
    const threadIds =
      threads.length < LIMIT && page === 1 ? threads.map(({ id }) => id) : [];
    setInbox({ threads: [], total: 0 });
    return fetch('/api/user-thread-status', {
      method: 'POST',
      body: JSON.stringify({
        communityId: currentCommunity.id,
        threadIds,
        muted: false,
        reminder: false,
        read: true,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  function markUserThreadStatuses({
    threadId,
    muted,
    reminder,
    read,
  }: {
    threadId: string;
    muted: boolean;
    reminder: boolean;
    read: boolean;
  }) {
    setLoading(true);
    return fetch('/api/user-thread-status', {
      method: 'POST',
      body: JSON.stringify({
        communityId: currentCommunity.id,
        threadIds: [threadId],
        muted,
        reminder,
        read,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(() => {
        setKey((key) => key + 1);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function markThreadAsRead(threadId: string) {
    markUserThreadStatuses({
      threadId,
      read: true,
      muted: false,
      reminder: false,
    });
  }

  function markThreadAsMuted(threadId: string) {
    markUserThreadStatuses({
      threadId,
      read: false,
      muted: true,
      reminder: false,
    });
  }

  const sendMessage = sendMessageWrapper({
    currentUser,
    allUsers,
    setThread,
    setInbox,
    communityId,
  });

  const createThread = createThreadWrapper({
    currentUser,
    allUsers,
    setThread,
    setInbox,
    communityId,
  });

  useKeyboard(
    {
      onKeyUp(event: KeyboardEvent) {
        const element = document.activeElement;
        if (element && element.id) {
          return false;
        }
        const { threads } = inbox;

        if (threads.length === 0) {
          return false;
        }
        const currentThreadId = thread?.id;
        if (!currentThreadId) {
          return false;
        }
        function selectPreviousThread() {
          const index = threads.findIndex(
            (thread) => thread.id === currentThreadId
          );
          if (index > 0) {
            const thread = threads[index - 1];
            setThread(thread);
          }
        }

        function selectNextThread() {
          const index = threads.findIndex(
            (thread) => thread.id === currentThreadId
          );
          if (index < threads.length - 1) {
            const thread = threads[index + 1];
            setThread(thread);
          }
        }

        if (event.key === 'ArrowUp' || event.key === 'k') {
          selectPreviousThread();
        } else if (event.key === 'ArrowDown' || event.key === 'j') {
          selectNextThread();
        } else if (event.key === 'e') {
          markThreadAsRead(currentThreadId);
        } else if (event.key === 'm') {
          markThreadAsMuted(currentThreadId);
        }
      },
    },
    [inbox, thread]
  );

  function showAddThreadModal() {
    setModal(ModalView.ADD_THREAD);
  }

  const { threads } = inbox;

  return (
    <>
      <SidebarLayout
        left={
          <>
            <Header
              total={inbox.total}
              threads={inbox.threads}
              isFetchingTotal={totalPolling}
              page={page}
              onAddClick={showAddThreadModal}
              onMarkAllAsRead={onMarkAllAsRead}
              onPageChange={(type: string) => {
                switch (type) {
                  case 'back':
                    return setPage((page) => page - 1);
                  case 'next':
                    return setPage((page) => page + 1);
                }
              }}
            />
            {threads.length > 0 ? (
              <Grid
                currentThreadId={thread?.id}
                threads={inbox.threads}
                loading={polling}
                selections={selections}
                permissions={permissions}
                onRead={markThreadAsRead}
                onMute={markThreadAsMuted}
                onChange={(id: string, checked: boolean, index: number) => {
                  setSelections((selections: Selections) => {
                    return manageSelections({
                      id,
                      checked,
                      index,
                      selections,
                      ids: inbox.threads.map((thread) => thread.id),
                      isShiftPressed,
                    });
                  });
                }}
                onSelect={(thread: SerializedThread) => {
                  setThread(thread);
                }}
              />
            ) : (
              <Empty loading={loading} />
            )}
          </>
        }
        right={
          thread && (
            <Thread
              thread={thread}
              key={thread.id}
              channelId={thread.channelId}
              channelName={thread.channel?.channelName as string}
              settings={settings}
              isSubDomainRouting={isSubDomainRouting}
              permissions={permissions}
              currentUser={currentUser}
              updateThread={updateThread}
              onClose={() => setThread(undefined)}
              sendMessage={sendMessage}
              token={token}
              onMessage={(message, messageId, imitationId) => {
                onThreadMessage(message, messageId, imitationId);
              }}
            />
          )
        }
        rightRef={ref}
      />
      <AddThreadModal
        communityId={currentCommunity.id}
        currentUser={currentUser}
        channels={channels}
        open={modal === ModalView.ADD_THREAD}
        close={() => setModal(undefined)}
        onSend={({ channelId, title, message }) => {
          setModal(undefined);
          return createThread({
            message,
            title,
            files: [],
            channel: channels.find(
              (channel) => channel.id === channelId
            ) as SerializedChannel,
          });
        }}
      />
    </>
  );
}