import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RichText, extractMessageUrls, MessageLinkPreviews } from './richText';

describe('RichText headings', () => {
  it('renders #, ## and ### lines as bold headings without the hashes', () => {
    render(<RichText content={'# Big\n## Medium\n### Stripe Test Card\nplain text'} />);
    const headings = screen.getAllByRole('heading');
    expect(headings.map((h) => [h.textContent, h.getAttribute('aria-level')])).toEqual([
      ['Big', '1'], ['Medium', '2'], ['Stripe Test Card', '3'],
    ]);
    expect(headings[2].className).toContain('font-bold!');
    expect(screen.getByText('plain text')).toBeInTheDocument();
  });

  it('keeps inline formatting inside a heading and leaves non-headings alone', () => {
    render(<RichText content={'### **Admin** notes for @Scott Schimmel\n#hashtag stays text\n- bullet'} />);
    const heading = screen.getByRole('heading');
    expect(heading.querySelector('strong')?.textContent).toBe('Admin');
    expect(heading.textContent).toBe('Admin notes for @Scott Schimmel');
    expect(screen.getByText('#hashtag stays text')).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByRole('listitem').textContent).toBe('bullet');
  });

  it('renders double-asterisk markers as bold (e.g. **Key Updates**)', () => {
    render(<RichText content={'**Key Updates**\nNext line'} />);
    const strong = screen.getByText('Key Updates');
    expect(strong.tagName).toBe('STRONG');
    expect(strong.className).toContain('font-bold!');
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.getByText('Next line')).toBeInTheDocument();
  });

  it('renders markdown links, strikethrough, and numbered lists', () => {
    render(<RichText content={'See [docs](https://example.com/docs) and ~~old~~\n1. first\n2. second'} />);
    const link = screen.getByRole('link', { name: 'docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(screen.getByText('old').tagName).toBe('DEL');
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['first', 'second']);
  });
});

describe('extractMessageUrls / MessageLinkPreviews', () => {
  it('dedupes markdown and bare urls', () => {
    expect(extractMessageUrls('a https://a.com/x and [b](https://a.com/x) plus https://b.com')).toEqual([
      'https://a.com/x',
      'https://b.com',
    ]);
  });

  it('renders hostname cards and image embeds', () => {
    render(<MessageLinkPreviews content={'https://example.com/path\nhttps://cdn.example.com/pic.png'} />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/pic.png');
  });
});
