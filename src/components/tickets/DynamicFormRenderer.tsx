import React from 'react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { TicketFieldDef, TicketFormSection } from '@/types/ticket';
import { useGetDepartmentsQuery } from '@/services/departmentService';

// Generic renderer for a ticket type's field_schema (M4 — Dynamic Form Engine).
// The schema shape is defined by the admin Ticket Type editor and validated
// server-side by validate_custom_fields; this component only needs to render
// inputs and report values — required/unknown-key enforcement stays on the
// backend so both always agree.

interface DynamicFormRendererProps {
  sections: TicketFormSection[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
}

const INPUT_TYPE_MAP: Record<string, string> = {
  text: 'text',
  number: 'number',
  date: 'date',
  time: 'time',
  email: 'email',
  phone: 'tel',
  url: 'url',
};

const FieldControl: React.FC<{
  field: TicketFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}> = ({ field, value, onChange, error }) => {
  const { data: departments = [] } = useGetDepartmentsQuery();
  const label = field.required ? `${field.label} *` : field.label;

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          label={label}
          placeholder={field.placeholder}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      );

    case 'checkbox':
    case 'switch':
      return (
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer py-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#005CDA] focus:ring-[#005CDA]/30"
          />
          {label}
        </label>
      );

    case 'select':
      return (
        <Select
          label={label}
          options={(field.options || []).map((o) => ({ label: o, value: o }))}
          value={(value as string) || ''}
          onChange={(v) => onChange(String(v))}
        />
      );

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (opt: string) =>
        onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
      return (
        <div>
          <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(field.options || []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selected.includes(opt)
                    ? 'bg-[#005CDA] text-white border-[#005CDA]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'department':
      return (
        <Select
          label={label}
          options={departments.map((d: { id: string; name: string }) => ({ label: d.name, value: d.id }))}
          value={(value as string) || ''}
          onChange={(v) => onChange(String(v))}
        />
      );

    default:
      // text/number/date/time/email/phone/url, plus entity types (user,
      // employee, team, project, asset, file, image) rendered as free text —
      // the backend treats all custom field values as opaque strings.
      return (
        <Input
          label={label}
          type={INPUT_TYPE_MAP[field.type] || 'text'}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          error={error}
        />
      );
  }
};

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({ sections, values, onChange, errors = {} }) => {
  if (!sections?.length) return null;
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.section}>
          {section.section && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">{section.section}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <FieldControl
                  field={field}
                  value={values[field.key] ?? field.default}
                  onChange={(v) => onChange(field.key, v)}
                  error={errors[field.key]}
                />
                {field.help_text && <p className="text-xs text-gray-400 mt-1 ml-1">{field.help_text}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DynamicFormRenderer;
