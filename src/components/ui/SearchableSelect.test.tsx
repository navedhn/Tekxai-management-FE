import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchableSelect from './SearchableSelect';

const OPTIONS = [
  { label: 'Engineering', value: 'eng' },
  { label: 'Sales', value: 'sales' },
  { label: 'Human Resources', value: 'hr' },
];

describe('SearchableSelect', () => {
  it('renders a search input once opened', () => {
    render(<SearchableSelect options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument();
  });

  it('filters options as the user types', () => {
    render(<SearchableSelect options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'sal' } });
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    expect(screen.queryByText('Human Resources')).not.toBeInTheDocument();
  });

  it('calls onChange with the selected option\'s value and closes the dropdown', () => {
    const onChange = vi.fn();
    render(<SearchableSelect options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Sales'));
    expect(onChange).toHaveBeenCalledWith('sales');
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation (ArrowDown + Enter)', () => {
    const onChange = vi.fn();
    render(<SearchableSelect options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('sales');
  });

  it('displays the currently selected option\'s label when closed', () => {
    render(<SearchableSelect options={OPTIONS} value="hr" onChange={() => {}} />);
    expect(screen.getByText('Human Resources')).toBeInTheDocument();
  });

  it('shows the placeholder when no value matches any option', () => {
    render(<SearchableSelect options={OPTIONS} value={null} onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('an empty-string value can be a real, selectable option (not treated as "no selection")', () => {
    const options = [{ label: 'Not department-specific', value: '' }, ...OPTIONS];
    render(<SearchableSelect options={options} value="" onChange={() => {}} clearable={false} />);

    expect(screen.getByText('Not department-specific')).toBeInTheDocument();
  });

  it('does not render a clear (X) button when clearable is false, even with a value selected', () => {
    render(<SearchableSelect options={OPTIONS} value="hr" onChange={() => {}} clearable={false} />);
    expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument();
  });

  it('shows an empty-state message when no options match the search term', () => {
    render(<SearchableSelect options={OPTIONS} onChange={() => {}} emptyMessage="Nothing here" />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'zzzznomatch' } });
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
