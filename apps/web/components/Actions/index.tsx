import classNames from 'classnames';
import Draggable from './Draggable';
import { getThreadUrl } from '../Pages/Channel/utilities/url';
import { Toast, Tooltip } from '@linen/ui';
import {
  Permissions,
  Settings,
  SerializedMessage,
  SerializedThread,
  SerializedUser,
} from '@linen/types';
import { copyToClipboard } from '@linen/utilities/clipboard';
import { GoPin } from 'react-icons/go';
import { AiOutlinePaperClip } from 'react-icons/ai';
import { RxDragHandleDots2 } from 'react-icons/rx';
import { FiThumbsUp } from 'react-icons/fi';
import styles from './index.module.scss';
import { Mode } from '@linen/hooks/mode';

interface Props {
  className?: string;
  thread: SerializedThread;
  message: SerializedMessage;
  permissions: Permissions;
  settings: Settings;
  isSubDomainRouting: boolean;
  currentUser: SerializedUser | null;
  mode?: Mode;
  drag: 'thread' | 'message';
  onPin?(threadId: string): void;
  onReaction?({
    threadId,
    messageId,
    type,
    active,
  }: {
    threadId: string;
    messageId: string;
    type: string;
    active: boolean;
  }): void;
}

function hasReaction(
  message: SerializedMessage,
  type: string,
  userId?: string
): boolean {
  if (!userId) {
    return false;
  }
  const reaction = message.reactions.find((reaction) => reaction.type === type);
  if (!reaction) {
    return false;
  }
  return !!reaction.users.find(({ id }) => id === userId);
}

export default function Actions({
  className,
  thread,
  message,
  permissions,
  settings,
  isSubDomainRouting,
  currentUser,
  mode,
  drag,
  onReaction,
  onPin,
}: Props) {
  const isReactionActive = hasReaction(message, ':thumbsup:', currentUser?.id);
  const owner = currentUser ? currentUser.id === message.usersId : false;
  const draggable = permissions.manage || owner;

  return (
    <ul className={classNames(styles.actions, className)}>
      {currentUser && draggable && (
        <li>
          <Draggable
            id={drag === 'thread' ? thread.id : message.id}
            draggable={draggable}
            source={drag}
            mode={mode}
          >
            <Tooltip
              className={styles.tooltip}
              text={drag === 'thread' ? 'Move thread' : 'Move message'}
            >
              <RxDragHandleDots2 />
            </Tooltip>
          </Draggable>
        </li>
      )}
      {onReaction && currentUser && (
        <li
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onReaction({
              threadId: thread.id,
              messageId: message.id,
              type: ':thumbsup:',
              active: isReactionActive,
            });
          }}
        >
          <Tooltip className={styles.tooltip} text="Like">
            <FiThumbsUp
              className={classNames({
                [styles.active]: isReactionActive,
              })}
            />
          </Tooltip>
        </li>
      )}
      <li
        onClick={(event) => {
          const text = getThreadUrl({
            isSubDomainRouting,
            settings,
            incrementId: thread.incrementId,
            slug: thread.slug,
          });
          event.stopPropagation();
          event.preventDefault();
          copyToClipboard(text);
          Toast.success('Copied to clipboard', text);
        }}
      >
        <Tooltip className={styles.tooltip} text="URL">
          <AiOutlinePaperClip />
        </Tooltip>
      </li>
      {onPin && permissions.manage && (
        <li
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onPin(thread.id);
          }}
        >
          <Tooltip className={styles.tooltip} text="Pin">
            <GoPin className={classNames({ [styles.active]: thread.pinned })} />
          </Tooltip>
        </li>
      )}
    </ul>
  );
}
