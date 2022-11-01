import * as fs from 'fs';

export default {
    name: 'file',
    validate () {},
    coerce (path: string) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return fs.readFileSync(path, 'utf8');
    }
};
