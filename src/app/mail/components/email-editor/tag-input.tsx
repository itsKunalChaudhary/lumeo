import React, { useState } from 'react';
import Avatar from 'react-avatar';
import Select from 'react-select';

type TagInputProps = {
    suggestions: string[];
    defaultValues?: { label: string, value: string }[];
    placeholder: string;
    label: string;

    onChange: (values: { label: string, value: string }[]) => void;
    value: { label: string, value: string }[];
};

const TagInput: React.FC<TagInputProps> = ({ suggestions, defaultValues = [], label, onChange, value }) => {
    const [input, setInput] = useState('');

    const options = suggestions.map(suggestion => ({
        label: (
            <span className='flex items-center gap-2'>
                <Avatar name={suggestion} size='25' textSizeRatio={2} round={true} />
                {suggestion}
            </span>
        ), value: suggestion
    }));

    return <div className="border rounded-md flex items-center">
        <span className='ml-3 text-sm text-gray-500'>{label}</span>
        <Select
            value={value}
            // @ts-ignore
            onChange={onChange}
            className='w-full flex-1'
            isMulti
            onInputChange={setInput}
            defaultValue={defaultValues}
            placeholder={''}
            options={input ? options.concat({
                label: (
                    <span className='flex items-center gap-2'>
                        <Avatar name={input} size='25' textSizeRatio={2} round={true} />
                        {input}
                    </span>
                ), value: input
            }) : options}
            classNames={{
                control: () => '!border-none !outline-none !ring-0 !shadow-none dark:bg-transparent',
                multiValue: () => 'dark:!bg-gray-700',
                multiValueLabel: () => 'dark:text-white dark:bg-gray-700 rounded-md',
                menu: () => 'dark:!bg-gray-900 dark:!border dark:!border-gray-700',
                menuList: () => 'dark:!bg-gray-900',
                option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) =>
                    isSelected
                        ? 'dark:!bg-blue-700 dark:!text-white'
                        : isFocused
                            ? 'dark:!bg-gray-700 dark:!text-white'
                            : 'dark:!bg-gray-900 dark:!text-white',
                input: () => 'dark:!text-white',
                singleValue: () => 'dark:!text-white',
                placeholder: () => 'dark:!text-gray-400',
            }}
            classNamePrefix="select"
        />
    </div>
};

export default TagInput;
