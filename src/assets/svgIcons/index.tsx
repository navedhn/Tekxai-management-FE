type SvgIconProps = {
    className?: string;
};
export const DashboardIcon = ({ className }: SvgIconProps) => {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M15 22.75H9C3.57 22.75 1.25 20.43 1.25 15V9C1.25 3.57 3.57 1.25 9 1.25H15C20.43 1.25 22.75 3.57 22.75 9V15C22.75 20.43 20.43 22.75 15 22.75ZM9 2.75C4.39 2.75 2.75 4.39 2.75 9V15C2.75 19.61 4.39 21.25 9 21.25H15C19.61 21.25 21.25 19.61 21.25 15V9C21.25 4.39 19.61 2.75 15 2.75H9Z"
                fill="#0D172F"
            />
            <path d="M12 22.75C11.59 22.75 11.25 22.41 11.25 22V2C11.25 1.59 11.59 1.25 12 1.25C12.41 1.25 12.75 1.59 12.75 2V22C12.75 22.41 12.41 22.75 12 22.75Z" fill="#0D172F" />
            <path d="M2 9.25H12C12.1339 9.25 12.25 9.36614 12.25 9.5C12.25 9.63386 12.1339 9.75 12 9.75H2C1.86614 9.75 1.75 9.63386 1.75 9.5C1.75 9.36614 1.86614 9.25 2 9.25Z" fill="#0D172F" stroke="#0D172F" />
            <path d="M22 15.25H12C11.59 15.25 11.25 14.91 11.25 14.5C11.25 14.09 11.59 13.75 12 13.75H22C22.41 13.75 22.75 14.09 22.75 14.5C22.75 14.91 22.41 15.25 22 15.25Z" fill="#0D172F" />
        </svg>
    );
};
export const DashboardActiveIcon = ({ className }: SvgIconProps) => {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.19 2H12.75V8V8.75V13.75H22V8.75V8V7.81C22 4.17 19.83 2 16.19 2Z" fill="white" />
            <path d="M2 10.25V15.25V15.75V16.19C2 19.83 4.17 22 7.81 22H11.25V15.75V15.25V10.25H2Z" fill="white" />
            <path d="M11.25 2V8.75H2V7.81C2 4.17 4.17 2 7.81 2H11.25Z" fill="white" />
            <path d="M22 15.25V16.19C22 19.83 19.83 22 16.19 22H12.75V15.25H22Z" fill="white" />
        </svg>
    );
};