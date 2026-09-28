import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RichText } from './richText';

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
});
