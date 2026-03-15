import { convertMarkdownToHtml } from '../utils/converter.js';

function compareTopicItems(leftItem, rightItem) {
  if (leftItem.updatedAt !== rightItem.updatedAt) {
    return rightItem.updatedAt - leftItem.updatedAt;
  }
  return leftItem.path.localeCompare(rightItem.path);
}

function typeMark(type) {
  switch (type) {
    case 'url':
      return '↗';
    case 'text':
      return '☰';
    case 'file':
      return '◫';
    default:
      return '';
  }
}

function displayTitle(topicName, item) {
  if (item.title) {
    return item.title;
  }

  const fullPath = item.fullPath || `${topicName}/${item.path}`;
  const topicPrefix = `${topicName}/`;
  if (fullPath.startsWith(topicPrefix)) {
    return fullPath.slice(topicPrefix.length);
  }

  return item.path || fullPath;
}

function buildTopicItemHref(topicName, item) {
  const topicDirectory = topicName.split('/').pop() || topicName;
  return `${topicDirectory}/${item.path}`;
}

function formatTopicItemLine(topicName, item, updatedAtLabel) {
  const itemTypeMark = typeMark(item.type);
  const lineSuffix = itemTypeMark
    ? ` ${itemTypeMark} · ${updatedAtLabel}`
    : ` · ${updatedAtLabel}`;
  return `- [${displayTitle(topicName, item)}](${buildTopicItemHref(topicName, item)})${lineSuffix}`;
}

function buildTopicItemLine(topicName, item, updatedAtLabel) {
  return formatTopicItemLine(topicName, item, updatedAtLabel);
}

export function buildTopicIndexMarkdown(topicName, topicTitle, items) {
  const lines = [`# ${topicTitle}`];
  const sortedItems = [...items].sort(compareTopicItems);
  let currentYear = '';

  if (sortedItems.length > 0) {
    for (const item of sortedItems) {
      const itemYear = new Date(item.updatedAt * 1000).getUTCFullYear().toString();
      const updatedAtLabel = new Date(item.updatedAt * 1000).toISOString().slice(5, 10);
      if (itemYear !== currentYear) {
        lines.push('');
        lines.push(`## ${itemYear}`);
        lines.push('');
        currentYear = itemYear;
      }
      lines.push(buildTopicItemLine(topicName, item, updatedAtLabel));
    }
  }

  return lines.join('\n');
}

export function renderTopicIndexHtml(topicName, topicTitle, items) {
  return convertMarkdownToHtml(buildTopicIndexMarkdown(topicName, topicTitle, items), {
    pageTitle: topicTitle,
  });
}
