import { expect } from 'chai';
import sinon from 'sinon';
import * as UTIL from '../../../../modules/openWrap/common.util.js';

describe('COMMON UTIL', () => {
    describe('#getGeoInfo', () => {
        let pbNameSpace;

        beforeEach((done) => {
            // Mock the namespace based on identity only flag
            pbNameSpace = "owpbjs"; // or "ihowpbjs" based on identity flag
            window[pbNameSpace] = {
                getDataFromLocalStorage: () => { },
                detectLocation: () => { },
                setAndStringifyToLocalStorage: () => { }
            };
            done();
        });

        afterEach((done) => {
            window[pbNameSpace] = undefined;
            done();
        });

        it('should fetch geo data from localStorage if valid data exists', (done) => {
            const mockGeoData = {
                cc: "US"
            };
            const getDataStub = sinon.stub(window[pbNameSpace], 'getDataFromLocalStorage').returns(JSON.stringify(mockGeoData));

            UTIL.getGeoInfo({ LOCALSTORAGE: 'localStorage' }, (source) => {
                expect(window.PWT.CC).to.deep.equal(mockGeoData);
                expect(source).to.equal('localStorage');
                getDataStub.restore();
                done();
            });
        });

        it('should fetch geo data from API if localStorage data is invalid', (done) => {
            const getDataStub = sinon.stub(window[pbNameSpace], 'getDataFromLocalStorage').returns(null);
            const detectLocationStub = sinon.stub(window[pbNameSpace], 'detectLocation').callsFake((url, callback) => {
                callback({ cc: "US" }, true);
            });

            UTIL.getGeoInfo({
                LOCALSTORAGE: 'localStorage',
                GEO_SERVICE: 'geoService'
            }, (source, loc) => {
                expect(window.PWT.CC).to.deep.equal({ cc: "US" });
                expect(source).to.equal('geoService');
                expect(loc).to.deep.equal({ cc: "US" });

                getDataStub.restore();
                detectLocationStub.restore();
                done();
            });
        });
    });

    describe('#shouldThrottle', () => {
        let randomStub, floorStub;

        beforeEach((done) => {
            randomStub = sinon.stub(Math, 'random');
            floorStub = sinon.stub(Math, 'floor');
            done();
        });

        afterEach((done) => {
            randomStub.restore();
            floorStub.restore();
            done();
        });

        it('is a function', (done) => {
            expect(UTIL.shouldThrottle).to.be.a('function');
            done();
        });

        it('should return true when random value is greater than throttle rate', (done) => {
            randomStub.returns(0.9);
            floorStub.returns(90);
            expect(UTIL.shouldThrottle(80)).to.be.true;
            done();
        });

        it('should return false when random value is less than throttle rate', (done) => {
            randomStub.returns(0.5);
            floorStub.returns(50);
            expect(UTIL.shouldThrottle(80)).to.be.false;
            done();
        });

        it('should use default maxRandomValue when not provided', (done) => {
            randomStub.returns(0.5);
            floorStub.returns(50);
            UTIL.shouldThrottle(30);
            expect(randomStub.calledOnce).to.be.true;
            expect(floorStub.calledWith(50)).to.be.true;
            done();
        });

        it('should use provided maxRandomValue', (done) => {
            randomStub.returns(0.5);
            floorStub.returns(25);
            UTIL.shouldThrottle(30, 50);
            expect(randomStub.calledOnce).to.be.true;
            expect(floorStub.calledWith(25)).to.be.true;
            done();
        });
    });
});
