import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/';
import { ConfigService } from '@nestjs/config';

import { isValidObjectId, Model } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';

import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common/exceptions';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class PokemonService {

  private defaultLimit: number;
  constructor(

    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService,
  ){
    this.defaultLimit = this.configService.getOrThrow('defaultLimit');
  }

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLocaleLowerCase();
    try {
      const pokemon = await this.pokemonModel.create( createPokemonDto );
      return pokemon;
    } catch (err) {
        this.errorHandler( err );
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = this.defaultLimit, offset = 0 } = paginationDto;
    return await this.pokemonModel.find()
    .limit(limit)
    .skip(offset)
    .sort( {
      no: 1
    })
    .select('-__v');
  }

  async findOne(term: string) {
    let pokemon: Pokemon;

    if( !isNaN(+term) ) {
      pokemon = await this.pokemonModel.findOne({ no: term })
    }

    if ( !pokemon && isValidObjectId(term) ) {
      pokemon = await this.pokemonModel.findById ( term )
    }

    if ( !pokemon ) {
      pokemon = await this.pokemonModel.findOne( { name: term.toLocaleLowerCase().trim() } )
    }

    if( !pokemon )
      throw new NotFoundException(`Pokemon with id, name or no "${term}" not found`)


    return pokemon;
  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {

    let pokemon = await this.findOne( term );

    try {
      await pokemon.updateOne(updatePokemonDto, {new: true});
      await pokemon.save();
    } catch (err) {
        this.errorHandler( err );
    }
    return pokemon;
  }

  async remove(id: string) {
    // const pokemon = await this.pokemonModel.findById(id);
    // if (!pokemon) {
    //   throw new NotFoundException(`Pokemon with id "${id}" not found`)
    // }
    // await pokemon.deleteOne();
    const {deletedCount} = await this.pokemonModel.deleteOne({ _id:id })
    if ( deletedCount === 0) {
      throw new BadRequestException (`Pokemon with id "${id}" does not exist`)
    }
    return;
  }


  private errorHandler(err: any) {
    if (err.code === 11000) 
    throw new BadRequestException(`Pokemon ${JSON.stringify(err.keyValue)} already exists`);

    console.log(err);
    throw new InternalServerErrorException(`Cant create Pokemon, check server logs`);
  }
}
