import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AvailabilityType, ResilocProxyMetadataType, TypeOfDataType } from '../enum/resiloc-proxy-metadata-type.enum';
import { ResilocProxy } from './resiloc-proxy.entity';

@Entity()
export class ResilocProxyMetadata {
    @PrimaryGeneratedColumn("uuid")
    _id: string;

    @Column({ type: "json", default: "{}" })
    certified: {
        type: ResilocProxyMetadataType;
        value: boolean;
    };

    @Column({ type: 'json', default: "{}" })
    dateOfData: {
        type: ResilocProxyMetadataType;
        value: Date;
    };

    @Column({ type: 'json', default: "{}" })
    periodOfReference: {
        type: ResilocProxyMetadataType;
        from: Date;
        to: Date;
    };

    @Column({ type: 'json', default: "{}" })
    sourceType: {
        type: ResilocProxyMetadataType;
        value: string;
    };

    @Column({ type: 'json', default: "{}" })
    actualSource: {
        type: ResilocProxyMetadataType;
        value: string;
    };

    @Column({ type: "json", default: "{}" })
    tooltip: {
        type: ResilocProxyMetadataType;
        value: string;
    };

    @Column({ type: "json", default: "{}" })
    availability: {
        type: ResilocProxyMetadataType;
        value: AvailabilityType;
    };

    @Column({ type: "json", default: "{}" })
    typeOfData: {
        type: ResilocProxyMetadataType;
        value: TypeOfDataType;
    };

    @OneToOne(() => ResilocProxy, resilocProxy => resilocProxy.metadata)
    resilocProxy: ResilocProxy;
}