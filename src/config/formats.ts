import * as fs from 'fs';

export default {
    name: 'file',
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    validate () {},
    coerce (path: string) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return fs.readFileSync(path, 'utf8');
    }
};
