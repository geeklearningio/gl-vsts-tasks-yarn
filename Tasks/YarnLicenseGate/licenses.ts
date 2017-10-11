import { forOwn, indexOf, groupBy, Dictionary } from "lodash";

export interface IYarnJsonLog {
    type: string;
    data: {
        head: ArrayLike<string>;
        body: ArrayLike<ArrayLike<string>>;
    };
}

export interface ICheckLog {
    success: boolean,
    failures: { [license: string]: ArrayLike<string>[] };
}

export class LicenseChecker {
    licenseGroups: Dictionary<ArrayLike<string>[]>;
    //private licenseGroups: Dictionary<ArrayLike<string>>;

    constructor(private source: IYarnJsonLog) {
        this.aggregate();
    }

    private aggregate(): void {
        var licenseColumnIndex = indexOf(this.source.data.head, "License");
        this.licenseGroups = groupBy(this.source.data.body, (item) => item[licenseColumnIndex]);
    }

    private checkLicenses(allowedLicenses: string[]): ICheckLog {
        let result : ICheckLog = {
            success : true,
            failures : {}
        };

        forOwn(this.licenseGroups, (value, key) => {
            if (indexOf(allowedLicenses, key) < 0) {
                result.success = false;
                result.failures[key] = value;
            }
        });

        return result;
    }
}