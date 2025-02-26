import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import './ImagePackUpload.scss';

import initMatrix from '../../../client/initMatrix';
import { scaleDownImage } from '../../../util/common';

import Text from '../../atoms/text/Text';
import { getText } from '../../../lang';
import { mdiPlusCircle } from '@mdi/js';
import { Button, IconButton, TextField } from '@mui/material';
import { Close } from '@mui/icons-material';

function ImagePackUpload({ onUpload }) {
    const mx = initMatrix.matrixClient;
    const inputRef = useRef(null);
    const shortcodeRef = useRef(null);
    const [imgFile, setImgFile] = useState(null);
    const [progress, setProgress] = useState(false);

    const handleSubmit = async (evt) => {
        evt.preventDefault();
        if (!imgFile) return;
        const { shortcodeInput } = evt.target;
        const shortcode = shortcodeInput.value.trim();
        if (shortcode === '') return;

        setProgress(true);
        const image = await scaleDownImage(imgFile, 512, 512);
        const { content_uri: url } = await mx.uploadContent(image);

        onUpload(shortcode, url);
        setProgress(false);
        setImgFile(null);
        shortcodeRef.current.value = '';
    };

    const handleFileChange = (evt) => {
        const img = evt.target.files[0];
        if (!img) return;
        setImgFile(img);
        shortcodeRef.current.value = img.name.slice(0, img.name.indexOf('.'));
        shortcodeRef.current.focus();
    };
    const handleRemove = () => {
        setImgFile(null);
        inputRef.current.value = null;
        shortcodeRef.current.value = '';
    };

    return (
        <form onSubmit={handleSubmit} className="image-pack-upload">
            <input ref={inputRef} onChange={handleFileChange} style={{ display: 'none' }} type="file" accept="image/*" required />
            {
                imgFile
                    ? (
                        <div className="image-pack-upload__file">
                            <IconButton onClick={handleRemove} tooltip={getText('tooltip.remove_file')}><Close /></IconButton>
                            <Text>{imgFile.name}</Text>
                        </div>
                    )
                    : <Button onClick={() => inputRef.current.click()}>{getText('btn.import_image')}</Button>
            }
            <TextField sx={{ flexGrow: 1 }} size='small' forwardRef={shortcodeRef} name="shortcodeInput" label="shortcode" required />
            <Button size='small' disabled={progress} variant="contained" type="submit">{getText(progress ? 'generic.uploading' : 'btn.upload')}</Button>
        </form>
    );
}
ImagePackUpload.propTypes = {
    onUpload: PropTypes.func.isRequired,
};

export default ImagePackUpload;
