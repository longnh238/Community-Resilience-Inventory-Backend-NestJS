import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Indicator } from '../../indicators/entities/indicator.entity';
import { ResilocProxy } from '../../resiloc-proxies/entities/resiloc-proxy.entity';
import { StaticProxyType } from '../enum/static-proxy-type.enum';
import { StaticProxyVisibility } from '../enum/static-proxy-visibility.enum';
import { StaticProxyMetadata } from './static-proxy-metadata.entity';

@Entity()
export class StaticProxy {
    @ApiProperty()
    @PrimaryGeneratedColumn("uuid")
    _id: string;

    @ApiProperty()
    @Column({ type: 'decimal', nullable: true, default: null })
    value: number;

    @ApiProperty()
    @Column({ type: 'decimal', nullable: true, default: null })
    minTarget: number;

    @ApiProperty()
    @Column({ type: 'decimal', nullable: true, default: null })
    maxTarget: number;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateCreated: Date;

    @ApiProperty()
    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateModified: Date;

    @Exclude()
    @Column({ type: 'enum', enum: StaticProxyType, nullable: true })
    type: StaticProxyType;

    @ApiProperty({
        enum: StaticProxyVisibility,
        enumName: 'StaticProxyVisibility'
    })
    @Column({ type: 'enum', enum: StaticProxyVisibility, default: StaticProxyVisibility.Draft })
    visibility: StaticProxyVisibility;

    @ApiProperty()
    @OneToOne(type => StaticProxyMetadata, metadata => metadata.staticProxy, { eager: true, cascade: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: "metadata_id" })
    metadata: StaticProxyMetadata;

    @ApiProperty({ type: () => ResilocProxy })
    @ManyToOne(type => ResilocProxy, resilocProxy => resilocProxy.staticProxies, { eager: true })
    @JoinColumn({ name: "resilocProxy_id" })
    resilocProxy: ResilocProxy;

    @ApiProperty()
    @ManyToMany(type => Indicator)
    indicators: Indicator[];
}