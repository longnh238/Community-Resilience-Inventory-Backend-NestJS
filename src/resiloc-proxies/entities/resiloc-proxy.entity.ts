import { ApiProperty } from "@nestjs/swagger";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ResilocIndicator } from "../../resiloc-indicators/entities/resiloc-indicator.entity";
import { StaticProxy } from "../../static-proxies/entities/static-proxy.entity";
import { ResilocProxyStatus } from "../enum/resiloc-proxy-status.enum";
import { ResilocProxyType } from "../enum/resiloc-proxy-type.enum";
import { ResilocProxyVisibility } from "../enum/resiloc-proxy-visibility.enum";
import { ResilocProxyMetadata } from "./resiloc-proxy-metadata.entity";

class UnitOfMeasurement {
    name: string;
    isDefault: boolean;
    fromDefaultMultiplier: number;
    toDefaultMultiplier: number;
}

@Entity()
export class ResilocProxy {
    @ApiProperty()
    @PrimaryGeneratedColumn("uuid")
    _id: string;

    @ApiProperty()
    @Column({ unique: true })
    name: string;

    @ApiProperty()
    @Column()
    description: string;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateCreated: Date;

    @ApiProperty()
    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateModified: Date;

    @ApiProperty({
        enum: ResilocProxyType,
        enumName: 'ResilocProxyType'
    })
    @Column({ type: 'enum', enum: ResilocProxyType })
    type: ResilocProxyType;

    @ApiProperty()
    @Column("text", { array: true, default: {} })
    tags: string[];

    @ApiProperty({
        enum: ResilocProxyStatus,
        enumName: 'ResilocProxyStatus'
    })
    @Column({ type: 'enum', enum: ResilocProxyStatus, default: ResilocProxyStatus.Requested })
    status: ResilocProxyStatus;

    @ApiProperty()
    @Column({ type: 'json', default: "{}" })
    unitOfMeasurement: UnitOfMeasurement[];

    @ApiProperty({
        enum: ResilocProxyVisibility,
        enumName: 'ResilocProxyVisibility'
    })
    @Column({ type: 'enum', enum: ResilocProxyVisibility, default: ResilocProxyVisibility.Draft })
    visibility: ResilocProxyVisibility;

    @ApiProperty()
    @OneToOne(type => ResilocProxyMetadata, metadata => metadata.resilocProxy, { eager: true, cascade: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: "metadata_id" })
    metadata: ResilocProxyMetadata;

    @OneToMany(type => StaticProxy, staticProxy => staticProxy.resilocProxy)
    staticProxies: StaticProxy[];

    @ApiProperty()
    @ManyToMany(type => ResilocIndicator)
    resilocIndicators: ResilocIndicator[];

    @BeforeInsert()
    textToLowwerCaseInsert() {
        for (let i = 0; i < this.tags.length; i++) {
            this.tags[i] = this.tags[i].replace(/\s\s+/g, ' ').trim().toLowerCase();
        }
    }

    @BeforeUpdate()
    textToLowwerCaseUpdate() {
        for (let i = 0; i < this.tags.length; i++) {
            this.tags[i] = this.tags[i].replace(/\s\s+/g, ' ').trim().toLowerCase();
        }
    }
}