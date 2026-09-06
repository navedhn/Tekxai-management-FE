import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepReview } from './index';

// Regression test for production bug: the "Review & Save" step of the
// Edit Employee wizard always showed "Employee ID: Auto-generated on save"
// even when editing an EXISTING employee who already has a real employee
// ID (e.g. "SS-29") — a presentation-only bug (the save payload never sent
// employee_id in edit mode and the backend update path cannot create or
// re-identify a user), but still a real, visible foot-gun for admins that
// could look like the system was about to mint a new ID.

const personal = {
  first_name: 'Jibran', last_name: 'Pervaiz', email: 'alex@constructestimates.com',
  phone: '', cnic: '', dob: '', gender: '', blood_group: '',
};
const work = { work_location: '', office_branch: '', work_start: '09:00', work_end: '18:00', working_days: [], is_remote: false };

describe('StepReview — Employee ID display', () => {
  it('shows the real existing employee_id when editing an existing employee', () => {
    const employment = { employee_id: 'SS-29', designation: 'AUS-CE Marketing Lead' };
    render(<StepReview personal={personal} employment={employment} work={work} isEditMode />);
    expect(screen.getByText('SS-29')).toBeInTheDocument();
    expect(screen.queryByText('Auto-generated on save')).not.toBeInTheDocument();
  });

  it('falls back to a dash (never "Auto-generated") when editing but employee_id is unexpectedly missing', () => {
    const employment = { employee_id: '', designation: '' };
    render(<StepReview personal={personal} employment={employment} work={work} isEditMode />);
    expect(screen.queryByText('Auto-generated on save')).not.toBeInTheDocument();
  });

  it('still shows "Auto-generated on save" when creating a brand new employee', () => {
    const employment = { employee_id: '', designation: '' };
    render(<StepReview personal={personal} employment={employment} work={work} isEditMode={false} />);
    expect(screen.getByText('Auto-generated on save')).toBeInTheDocument();
  });
});
