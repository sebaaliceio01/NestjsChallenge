import { Test, TestingModule } from '@nestjs/testing';
import { ProductUseCase } from './product.usecase';
import { ProductOutputUseCase } from '../../domain/ports/product.output.usecase';
import { SaveProductDto } from '../dto/save-product-dto';
import { GetProductMatchesDto, GetProductMatchesResponseDto } from '../dto';
import { Product } from '../../domain/entity/product-entity';

describe('ProductUseCase', () => {
    let productUseCase: ProductUseCase;
    let productOutputMock: ProductOutputUseCase;

    beforeEach(async () => {
        productOutputMock = {
            saveProducts: jest.fn(),
            getProductMatchesById: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [ProductUseCase, { provide: ProductOutputUseCase, useValue: productOutputMock }],
        }).compile();

        productUseCase = module.get<ProductUseCase>(ProductUseCase);
    });

    describe('saveProducts', () => {
        it('should save products successfully', async () => {
            const saveProductDto: SaveProductDto = {
                products: [
                    { id: '1', name: 'Product 1', description: 'Description 1', tags: ['tag1', 'tag2'] },
                    { id: '2', name: 'Product 2', description: 'Description 2', tags: ['tag3', 'tag4'] },
                ],
            };

            jest.spyOn(productOutputMock, 'saveProducts').mockResolvedValue(undefined);

            await productUseCase.saveProducts(saveProductDto);

            const expectedProducts = saveProductDto.products.map(
                (product) => new Product(product.id, product.name, product.description, product.tags),
            );

            expect(productOutputMock.saveProducts).toHaveBeenCalledWith(expectedProducts);
        });

        it('should log an error if saving products fails', async () => {
            const saveProductDto: SaveProductDto = {
                products: [{ id: '1', name: 'Product 1', description: 'Description 1', tags: ['tag1', 'tag2'] }],
            };

            const error = new Error('Save failed');
            jest.spyOn(productOutputMock, 'saveProducts').mockRejectedValue(error);
            const loggerSpy = jest.spyOn(productUseCase.logger, 'error');

            await expect(productUseCase.saveProducts(saveProductDto)).rejects.toThrow(error);

            expect(loggerSpy).toHaveBeenCalledWith(`SaveProductsError: ${error.message}`);
        });
    });

    describe('getProductsMatchesById', () => {
        it('should get product matches successfully', async () => {
            const getProductMatchesDto: GetProductMatchesDto = { productId: '1' };
            const mockResponse: GetProductMatchesResponseDto = {
                recommendations: [
                    { productId: '1', score: 0.9 },
                    { productId: '2', score: 0.8 },
                ] as any,
            };

            jest.spyOn(productOutputMock, 'getProductMatchesById').mockResolvedValue({
                matches: [
                    { id: '1', score: 0.9 },
                    { id: '2', score: 0.8 },
                ],
            } as any);

            const result = await productUseCase.getProductsMatchesById(getProductMatchesDto);

            expect(productOutputMock.getProductMatchesById).toHaveBeenCalledWith(getProductMatchesDto.productId);
            expect(result).toEqual(mockResponse);
        });

        it('should log an error if getting product matches fails', async () => {
            const getProductMatchesDto: GetProductMatchesDto = { productId: '1' };
            const error = new Error('Query failed');

            jest.spyOn(productOutputMock, 'getProductMatchesById').mockRejectedValue(error);
            const loggerSpy = jest.spyOn(productUseCase.logger, 'error');

            await expect(productUseCase.getProductsMatchesById(getProductMatchesDto)).rejects.toThrow(error);

            expect(loggerSpy).toHaveBeenCalledWith(`GetProductsMatchesError: ${error.message}`);
        });
    });
});
