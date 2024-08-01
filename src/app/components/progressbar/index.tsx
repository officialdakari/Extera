import React from 'react';
const ProgressBar = (props: { bgcolor: string, completed: number }) => {
    const { bgcolor, completed } = props;

    const containerStyles = {
        height: 20,
        width: '100%',
        backgroundColor: "#e0e0de",
        borderRadius: '2px',
        position: 'relative'
    };

    const fillerStyles = {
        height: '100%',
        width: `${completed}%`,
        backgroundColor: bgcolor,
        borderRadius: 'inherit',
        textAlign: 'right'
    };

    const labelStyles = {
        padding: 5,
        color: 'white',
        fontWeight: 'bold'
    };

    return (
        <div style={containerStyles}>
            <div style={fillerStyles}>
                <span style={labelStyles}>{`${completed}%`}</span>
            </div>
        </div>
    );
};

export default ProgressBar;