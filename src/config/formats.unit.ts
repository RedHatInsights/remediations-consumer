import '../../test';
import convict from 'convict';
import formats from './formats';

convict.addFormat(formats);

let config: any = null;

beforeEach(() => {
    config = convict({
        test: {
            format: 'file',
            default: undefined
        }
    });
});

describe('file format unit tests', function () {
    it('reads a file', () => {
        config.set('test', './src/config/formats.txt').get('test').should.equal('foo\n');
    });

    it('uses default value', () => {
        expect(config.get('test')).toBeUndefined();
    });

    it('throws an error on file not found', () => {
        expect(() => config.set('test', './missing.txt').get('test')).toThrow();
    });
});
