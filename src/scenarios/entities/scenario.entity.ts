import { ApiProperty } from "@nestjs/swagger";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Indicator } from "../../indicators/entities/indicator.entity";
import { ResilocScenario } from "../../resiloc-scenarios/entities/resiloc-scenario.entity";
import { ResilocScenarioMetadataMandatory, ResilocScenarioMetadataType } from "../../resiloc-scenarios/enum/resiloc-scenario-metadata.enum";
import { ScenarioStatus } from "../enum/scenario-status.enum";
import { ScenarioVisibility } from "../enum/scenario-visibility.enum";

export class ScenarioMetaData {
    name: string;
    type: ResilocScenarioMetadataType;
    mandatory: ResilocScenarioMetadataMandatory;
    value: string | number;
}

@Entity()
export class Scenario {
    @ApiProperty()
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateCreated: Date;

    @ApiProperty()
    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateModified: Date;

    @ApiProperty({
        enum: ScenarioVisibility,
        enumName: 'ScenarioVisibility'
    })
    @Column({ type: 'enum', enum: ScenarioVisibility, default: ScenarioVisibility.Draft })
    visibility: ScenarioVisibility;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateSubmitted: Date;

    @ApiProperty({
        enum: ScenarioStatus,
        enumName: 'ScenarioStatus'
    })
    @Column({ type: 'enum', enum: ScenarioStatus, default: ScenarioStatus.OnHold })
    status: ScenarioStatus;

    @ApiProperty()
    @Column({ type: 'json', default: "[]" })
    metadata: ScenarioMetaData[];

    @ApiProperty({ type: () => ResilocScenario })
    @ManyToOne(type => ResilocScenario, resilocScenario => resilocScenario.scenarios, { eager: true })
    @JoinColumn({ name: "resilocScenario_id" })
    resilocScenario: ResilocScenario;

    @ApiProperty()
    @ManyToMany(type => Indicator, { eager: true, cascade: true, onDelete: 'CASCADE' })
    @JoinTable()
    indicators: Indicator[];

    @BeforeInsert()
    textToLowwerCaseInsert() {
        for (let i = 0; i < this.metadata.length; i++) {
            this.metadata[i].name = this.metadata[i].name.replace(/\s\s+/g, ' ').trim().toLowerCase();
        }
    }

    @BeforeUpdate()
    textToLowwerCaseUpdate() {
        for (let i = 0; i < this.metadata.length; i++) {
            this.metadata[i].name = this.metadata[i].name.replace(/\s\s+/g, ' ').trim().toLowerCase();
        }
    }
}