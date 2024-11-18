import { Test, TestingModule } from '@nestjs/testing';
import { PineconeRepository } from '../../../../repositories/pinecone/pinecone-repository.service';
import { OpenaiService } from '../../../../providers/openai/openai.service';
import { Product } from '../../domain/entity/product-entity';
import { ProductRepository } from './product-repository.service';

describe('ProductRepository', () => {
    let productRepository: ProductRepository;
    let pineconeRepository: PineconeRepository;
    let openaiService: OpenaiService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductRepository,
                {
                    provide: PineconeRepository,
                    useValue: {
                        create: jest.fn(),
                        query: jest.fn(),
                    },
                },
                {
                    provide: OpenaiService,
                    useValue: {
                        generateEmbedding: jest.fn(),
                    },
                },
            ],
        }).compile();

        productRepository = module.get<ProductRepository>(ProductRepository);
        pineconeRepository = module.get<PineconeRepository>(PineconeRepository);
        openaiService = module.get<OpenaiService>(OpenaiService);
    });

    describe('getProductMatchesById', () => {
        it('should query Pinecone for product matches', async () => {
            const mockResponse = {
                matches: [
                    { id: '1', score: 0.9 },
                    { id: '2', score: 0.8 },
                ],
            };

            jest.spyOn(pineconeRepository, 'query').mockResolvedValue(mockResponse as any);

            const result = await productRepository.getProductMatchesById('1');
            expect(pineconeRepository.query).toHaveBeenCalledWith({ id: '1', topK: 5 });
            expect(result).toEqual(mockResponse);
        });

        it('should log an error if Pinecone query fails', async () => {
            jest.spyOn(pineconeRepository, 'query').mockRejectedValue(new Error('Query failed'));

            await expect(productRepository.getProductMatchesById('1')).rejects.toThrow('Query failed');
        });
    });

    describe('generateVector', () => {
        it('should generate a vector for a product', async () => {
            const mockProduct: Product = {
                id: '1',
                name: 'Product1',
                description: 'Description1',
                tags: ['tag1'],
            } as any;

            const mockEmbedding = [0.1, 0.2, 0.3];

            jest.spyOn(openaiService, 'generateEmbedding').mockResolvedValue(mockEmbedding);

            const result = await productRepository.generateVector(mockProduct);

            expect(openaiService.generateEmbedding).toHaveBeenCalledWith('tag1');
            expect(result).toEqual({
                id: '1',
                values: mockEmbedding,
                metadata: {
                    id: '1',
                    name: 'Product1',
                    tags: ['tag1'],
                    description: 'Description1',
                },
            });
        });

        it('should retry if embedding generation fails', async () => {
            const mockProduct: Product = {
                id: '1',
                name: 'Product1',
                description: 'Description1',
                tags: ['tag1'],
            } as any;

            const mockEmbedding = [0.1, 0.2, 0.3];

            jest.spyOn(openaiService, 'generateEmbedding')
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockResolvedValueOnce(mockEmbedding);

            const result = await productRepository.generateVector(mockProduct);

            expect(openaiService.generateEmbedding).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                id: '1',
                values: mockEmbedding,
                metadata: {
                    id: '1',
                    name: 'Product1',
                    tags: ['tag1'],
                    description: 'Description1',
                },
            });
        });

        it('should throw an error if all retries fail', async () => {
            const mockProduct: Product = {
                id: '1',
                name: 'Product1',
                description: 'Description1',
                tags: ['tag1'],
            } as any;

            jest.spyOn(openaiService, 'generateEmbedding').mockRejectedValue(new Error('Permanent failure'));

            await expect(productRepository.generateVector(mockProduct)).rejects.toThrow('Permanent failure');
        });
    });
});
